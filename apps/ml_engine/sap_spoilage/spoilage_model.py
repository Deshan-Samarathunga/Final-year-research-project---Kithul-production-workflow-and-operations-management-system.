"""
KithulFlow Sap Spoilage Prediction Model
=========================================
ML-based prediction of remaining viable hours for collected kithul sap.

Functional Requirements Covered:
  1. Data Validation & Cleaning
  3. Model Training (Multi-model comparison)
  4. Prediction Output (Hours + Estimated Spoilage DateTime)
  5. Decision Support Generation (4 Risk Bands + Priority)
  6. Integration (Web App API Pipeline + Power BI CSV Export)

Data Pipeline:
  The model fetches real quality-check data from the KithulFlow web app
  via the REST API endpoint: GET /api/field-collection/research/spoilage-dataset.csv
  When the web server is unavailable, it falls back to the local sap_data.csv file.
"""

import io
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Union
from urllib.error import URLError
from urllib.request import urlopen

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor


# ─── Configuration ───────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "sap_data.csv"
DEFAULT_OUTPUT_PATH = BASE_DIR / "spoilage_predictions_for_powerbi.csv"

# Web app API endpoint for real training data
API_BASE_URL = "http://localhost:4000"
RESEARCH_ENDPOINT = "/api/research/spoilage-dataset.csv"
API_TIMEOUT_SECONDS = 5

SYSTEM_CAN_COLUMN = "canCode"
OUTPUT_CAN_ID_COLUMN = "Can_ID"
FEATURE_COLUMNS = ["Initial_pH", "Initial_Brix", "Temperature"]
TARGET_COLUMN = "Time_Until_Spoilage_Hours"

# Risk band thresholds (hours)
CRITICAL_THRESHOLD = 6
HIGH_THRESHOLD = 10
MEDIUM_THRESHOLD = 18

# Valid value ranges for data validation
PH_RANGE = (3.0, 9.0)
BRIX_RANGE = (0.0, 30.0)
TEMP_RANGE = (-5.0, 50.0)
TARGET_RANGE = (0.0, 200.0)

TEST_SIZE = 0.2
RANDOM_STATE = 42


# ─── 1. Data Validation & Cleaning ──────────────────────────────────────────

def fetch_from_api(
    base_url: str = API_BASE_URL,
    endpoint: str = RESEARCH_ENDPOINT,
) -> pd.DataFrame:
    """
    Fetch real quality-check data from the KithulFlow web app REST API.

    The web server exposes a research CSV endpoint that exports processing
    quality checks from PostgreSQL. This function downloads that CSV and
    maps the API column names to the ML model's expected schema:

        API column            ->  ML column
        ─────────────────────────────────────
        initialPh             ->  Initial_pH
        initialBrix           ->  Initial_Brix
        initialTemperatureC   ->  Temperature
        timeUntilCheckHours   ->  Time_Until_Spoilage_Hours
    """
    url = f"{base_url}{endpoint}"
    response = urlopen(url, timeout=API_TIMEOUT_SECONDS)
    raw_csv = response.read().decode("utf-8")
    api_df = pd.read_csv(io.StringIO(raw_csv))

    if api_df.empty:
        raise ValueError("API returned an empty dataset (no quality checks recorded yet)")

    # Map API columns to ML model schema
    ml_df = pd.DataFrame({
        "Initial_pH": pd.to_numeric(api_df["initialPh"], errors="coerce"),
        "Initial_Brix": pd.to_numeric(api_df["initialBrix"], errors="coerce"),
        "Temperature": pd.to_numeric(api_df["initialTemperatureC"], errors="coerce"),
        TARGET_COLUMN: pd.to_numeric(api_df["timeUntilCheckHours"], errors="coerce"),
    })

    # Keep the can code for traceability (optional column, not used in training)
    if "canCode" in api_df.columns:
        ml_df.insert(0, "canCode", api_df["canCode"])

    return ml_df


def load_data(
    data_path: Union[str, Path] = DATA_PATH,
    use_api: bool = True,
) -> Tuple[pd.DataFrame, str]:
    """
    Load the sap spoilage dataset.

    Data source priority:
      1. Web app REST API (real quality-check data from PostgreSQL)
      2. Local CSV file (static sample data for offline/demo use)

    Returns: (dataframe, source_label)
    """
    if use_api:
        try:
            df = fetch_from_api()
            return df, f"Web API ({API_BASE_URL})"
        except (URLError, OSError, ValueError, KeyError) as exc:
            print(f"  [INFO] API not available ({exc}), falling back to local CSV")

    return pd.read_csv(data_path), f"Local CSV ({Path(data_path).name})"


def validate_and_clean(dataframe: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and clean the sap quality dataset.

    Steps:
      - Check required columns exist
      - Remove duplicate rows
      - Handle missing values (drop rows with NaN in required columns)
      - Remove extreme/outlier values outside valid ranges
      - Report cleaning summary
    """
    required_columns = [*FEATURE_COLUMNS, TARGET_COLUMN]
    missing_cols = [c for c in required_columns if c not in dataframe.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {', '.join(missing_cols)}")

    original_count = len(dataframe)
    df = dataframe.copy()

    # Remove exact duplicate rows
    df = df.drop_duplicates()
    after_dedup = len(df)

    # Drop rows with missing values in required columns
    df = df.dropna(subset=required_columns)
    after_na = len(df)

    # Remove extreme values outside valid ranges
    df = df[
        (df["Initial_pH"].between(*PH_RANGE))
        & (df["Initial_Brix"].between(*BRIX_RANGE))
        & (df["Temperature"].between(*TEMP_RANGE))
        & (df[TARGET_COLUMN].between(*TARGET_RANGE))
    ]
    after_range = len(df)

    print(f"  Original rows:        {original_count}")
    print(f"  After deduplication:  {after_dedup} (removed {original_count - after_dedup})")
    print(f"  After NaN removal:    {after_na} (removed {after_dedup - after_na})")
    print(f"  After range filter:   {after_range} (removed {after_na - after_range})")
    print(f"  Clean rows ready:     {after_range}")

    if after_range == 0:
        raise ValueError("No valid data remaining after cleaning!")

    return df.reset_index(drop=True)


# ─── 3. Model Training (Multi-Model Comparison) ─────────────────────────────

def get_models() -> Dict[str, object]:
    """Return dictionary of regression models to compare."""
    return {
        "Linear Regression": LinearRegression(),
        "Decision Tree": DecisionTreeRegressor(random_state=RANDOM_STATE),
        "Random Forest": RandomForestRegressor(
            n_estimators=50, random_state=RANDOM_STATE
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=50, random_state=RANDOM_STATE
        ),
    }


def train_and_compare(
    dataframe: pd.DataFrame,
) -> Tuple[object, str, pd.DataFrame, pd.DataFrame, pd.Series]:
    """
    Train all candidate models, evaluate each, and return the best one.

    Evaluation metrics: MAE, RMSE, R-squared.
    Returns: (best_model, best_name, results_df, X_test, y_test)
    """
    X = dataframe[FEATURE_COLUMNS]
    y = dataframe[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )

    print(f"  Training set size: {len(X_train)}")
    print(f"  Test set size:     {len(X_test)}")
    print()

    models = get_models()
    results: List[Dict] = []
    trained_models: Dict[str, object] = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        r2 = r2_score(y_test, predictions)

        results.append({
            "Model": name,
            "MAE (Hours)": round(mae, 2),
            "RMSE (Hours)": round(rmse, 2),
            "R2 Score": round(r2, 4),
        })
        trained_models[name] = model

        print(f"  {name:25s} | MAE={mae:6.2f}h | RMSE={rmse:6.2f}h | R2={r2:7.4f}")

    results_df = pd.DataFrame(results)

    # Select best model by lowest MAE
    best_row = results_df.loc[results_df["MAE (Hours)"].idxmin()]
    best_name = best_row["Model"]
    best_model = trained_models[best_name]

    print(f"\n  >>> Best Model: {best_name} (MAE = {best_row['MAE (Hours)']} Hours)")

    return best_model, best_name, results_df, X_test, y_test


# ─── 5. Decision Support Generation (4 Risk Bands) ──────────────────────────

def classify_risk(hours: float) -> str:
    """
    Categorize predicted spoilage time into 4 operational risk bands.

    - Critical: < 6 hours  → immediate processing required
    - High:     6–10 hours → prioritize for next processing batch
    - Medium:   10–18 hours → schedule within the day
    - Low:      ≥ 18 hours → safe for regular processing queue
    """
    if hours < CRITICAL_THRESHOLD:
        return "Critical"
    elif hours < HIGH_THRESHOLD:
        return "High"
    elif hours < MEDIUM_THRESHOLD:
        return "Medium"
    else:
        return "Low"


def generate_priority(risk: str) -> str:
    """Generate an actionable processing recommendation for each risk band."""
    recommendations = {
        "Critical": "URGENT: Process immediately - spoilage imminent",
        "High": "PRIORITY: Schedule for next processing batch",
        "Medium": "NORMAL: Process within today's schedule",
        "Low": "QUEUE: Safe for regular processing order",
    }
    return recommendations.get(risk, "Unknown")


# ─── 4 + 6. Prediction Output & Integration ─────────────────────────────────

def generate_predictions(
    current_batches_df: pd.DataFrame,
    model: object,
    output_path: Union[str, Path] = DEFAULT_OUTPUT_PATH,
    collection_time: datetime | None = None,
) -> pd.DataFrame:
    """
    Predict spoilage time for current sap batches and export Power BI results.

    Outputs:
      - Predicted_Spoilage_Hours (continuous value)
      - Estimated_Spoilage_DateTime (calculated from collection_time)
      - Risk_Category (Critical / High / Medium / Low)
      - Processing_Priority (actionable recommendation)
    """
    required = [SYSTEM_CAN_COLUMN, *FEATURE_COLUMNS]
    missing_columns = [c for c in required if c not in current_batches_df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    if collection_time is None:
        collection_time = datetime.now()

    results_df = current_batches_df.copy()
    system_can_ids = results_df.pop(SYSTEM_CAN_COLUMN).astype(str).str.upper()

    # Prediction
    predicted_hours = model.predict(results_df[FEATURE_COLUMNS])
    # Ensure non-negative predictions
    predicted_hours = np.maximum(predicted_hours, 0.0)

    results_df["Predicted_Spoilage_Hours"] = np.round(predicted_hours, 2)

    # Estimated spoilage datetime
    results_df["Estimated_Spoilage_DateTime"] = [
        (collection_time + timedelta(hours=float(h))).strftime("%Y-%m-%d %H:%M")
        for h in predicted_hours
    ]

    # Risk classification (4 bands)
    results_df["Risk_Category"] = results_df["Predicted_Spoilage_Hours"].apply(
        classify_risk
    )

    # Processing priority recommendation
    results_df["Processing_Priority"] = results_df["Risk_Category"].apply(
        generate_priority
    )

    # Insert Can_ID as first column
    if OUTPUT_CAN_ID_COLUMN in results_df.columns:
        results_df = results_df.drop(columns=[OUTPUT_CAN_ID_COLUMN])
    results_df.insert(0, OUTPUT_CAN_ID_COLUMN, system_can_ids.to_numpy())

    # Export CSV for Power BI
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(output_path, index=False)

    return results_df


# ─── Main Pipeline ───────────────────────────────────────────────────────────

def main() -> None:
    """Run the complete sap spoilage prediction pipeline."""

    # ── Step 1: Data Loading ──
    print("=" * 60)
    print("STEP 1: Data Loading")
    print("=" * 60)
    df, data_source = load_data()
    print(f"  Source: {data_source}")
    print(f"  Loaded {len(df)} records")
    print(df.head())

    # ── Step 2: Data Validation & Cleaning ──
    print("\n" + "=" * 60)
    print("STEP 2: Data Validation & Cleaning")
    print("=" * 60)
    df_clean = validate_and_clean(df)

    # ── Step 3: Multi-Model Training & Comparison ──
    print("\n" + "=" * 60)
    print("STEP 3: Multi-Model Training & Comparison")
    print("=" * 60)
    best_model, best_name, comparison_df, X_test, y_test = train_and_compare(df_clean)

    print("\n  Model Comparison Table:")
    print(comparison_df.to_string(index=False))

    # ── Step 4: Prediction Output + Decision Support ──
    print("\n" + "=" * 60)
    print("STEP 4: Prediction & Decision Support")
    print("=" * 60)

    # Simulate current sap batches from 3 system cans
    current_sap_batches = pd.DataFrame({
        "canCode": ["AR001", "AR002", "AR003", "AR004", "AR005"],
        "Initial_pH": [6.1, 5.8, 6.5, 5.5, 6.0],
        "Initial_Brix": [11.0, 10.0, 12.0, 9.5, 11.2],
        "Temperature": [30, 32, 5, 34, 28],
    })

    # Use a fixed collection time for demo reproducibility
    demo_collection_time = datetime(2026, 5, 11, 8, 0, 0)

    prediction_results = generate_predictions(
        current_sap_batches,
        best_model,
        collection_time=demo_collection_time,
    )

    print(f"\n  Best Model Used: {best_name}")
    print(f"  Collection Time: {demo_collection_time.strftime('%Y-%m-%d %H:%M')}")
    print()
    print(prediction_results.to_string(index=False))

    print(f"\n  [OK] Predictions exported to: {DEFAULT_OUTPUT_PATH.name}")

    # ── Summary ──
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    risk_counts = prediction_results["Risk_Category"].value_counts()
    for risk in ["Critical", "High", "Medium", "Low"]:
        count = risk_counts.get(risk, 0)
        if count > 0:
            print(f"  {risk:10s}: {count} can(s)")


if __name__ == "__main__":
    main()
