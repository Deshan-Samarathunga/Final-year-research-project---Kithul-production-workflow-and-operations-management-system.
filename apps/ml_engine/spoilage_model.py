from pathlib import Path
from typing import Tuple, Union

import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "sap_data.csv"
DEFAULT_OUTPUT_PATH = BASE_DIR / "spoilage_predictions_for_powerbi.csv"

SYSTEM_CAN_COLUMN = "canCode"
OUTPUT_CAN_ID_COLUMN = "Can_ID"
FEATURE_COLUMNS = ["Initial_pH", "Initial_Brix", "Temperature"]
TARGET_COLUMN = "Time_Until_Spoilage_Hours"
RISK_THRESHOLD_HOURS = 10
TEST_SIZE = 0.2
RANDOM_STATE = 42


def load_data(data_path: Union[str, Path] = DATA_PATH) -> pd.DataFrame:
    """Load the historical sap spoilage dataset."""
    return pd.read_csv(data_path)


def train_model(
    dataframe: pd.DataFrame,
) -> Tuple[LinearRegression, pd.DataFrame, pd.Series, int, int]:
    """Split the dataset and train the spoilage prediction model."""
    X = dataframe[FEATURE_COLUMNS]
    y = dataframe[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )

    model = LinearRegression()
    model.fit(X_train, y_train)

    return model, X_test, y_test, len(X_train), len(X_test)


def evaluate_model(
    model: LinearRegression,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> float:
    """Evaluate the model using Mean Absolute Error."""
    predictions = model.predict(X_test)
    return mean_absolute_error(y_test, predictions)


def generate_predictions(
    current_batches_df: pd.DataFrame,
    model: LinearRegression,
    output_path: Union[str, Path] = DEFAULT_OUTPUT_PATH,
) -> pd.DataFrame:
    """
    Predict spoilage time for current sap batches and export Power BI results.

    Risk categories:
    - High Risk: predicted spoilage time is less than 10 hours.
    - Low Risk: predicted spoilage time is 10 hours or more.
    """
    missing_columns = [
        column
        for column in [SYSTEM_CAN_COLUMN, *FEATURE_COLUMNS]
        if column not in current_batches_df.columns
    ]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    results_df = current_batches_df.copy()
    system_can_ids = results_df.pop(SYSTEM_CAN_COLUMN).astype(str).str.upper()

    results_df["Predicted_Spoilage_Hours"] = model.predict(
        results_df[FEATURE_COLUMNS]
    ).round(2)
    results_df["Risk_Category"] = results_df["Predicted_Spoilage_Hours"].apply(
        lambda hours: "High Risk" if hours < RISK_THRESHOLD_HOURS else "Low Risk"
    )

    # Use the real system can code (for example, AR001) as the first CSV column.
    if OUTPUT_CAN_ID_COLUMN in results_df.columns:
        results_df = results_df.drop(columns=[OUTPUT_CAN_ID_COLUMN])
    results_df.insert(0, OUTPUT_CAN_ID_COLUMN, system_can_ids.to_numpy())

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(output_path, index=False)

    return results_df


def main() -> None:
    """Run model training, evaluation, and a sample prediction export."""
    print("--- Data Loading ---")
    df = load_data()
    print(df.head())

    print("\n--- Model Training ---")
    model, X_test, y_test, train_size, test_size = train_model(df)
    print("Training Data Size:", train_size)
    print("Testing Data Size:", test_size)
    print("Model Training Successful!")

    print("\n--- Model Evaluation ---")
    mae = evaluate_model(model, X_test, y_test)
    print(f"Mean Absolute Error (MAE): {mae:.2f} Hours")

    print("\n--- Power BI Prediction Export ---")
    current_sap_batches = pd.DataFrame(
        {
            "canCode": ["AR001", "AR002", "AR003"],
            "Initial_pH": [6.1, 5.8, 6.5],
            "Initial_Brix": [11.0, 10.0, 12.0],
            "Temperature": [30, 32, 5],
        }
    )

    prediction_results = generate_predictions(current_sap_batches, model)
    print(prediction_results)
    print(f"Predictions exported to: {DEFAULT_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
