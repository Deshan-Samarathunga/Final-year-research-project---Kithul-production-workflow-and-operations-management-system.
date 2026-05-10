import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

# 1. Local file eken data read kirima
print("--- Data Loading ---")
df = pd.read_csv('sap_data.csv') 
print(df.head())

# 2. Train-Test Split
print("\n--- Data Splitting ---")
X = df[['Initial_pH', 'Initial_Brix', 'Temperature']]
y = df['Time_Until_Spoilage_Hours']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print("Training Data Size:", len(X_train))
print("Testing Data Size:", len(X_test))

# 3. Model Training
print("\n--- Model Training ---")
model = LinearRegression()
model.fit(X_train, y_train)
print("Model Training Successful!")

# 4. Model Evaluation
print("\n--- Model Evaluation ---")
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
print(f"Mean Absolute Error (MAE): {mae:.2f} Hours")

# 5. Live Demo
print("\n=== LIVE PREDICTION DEMO ===")
new_sap_batch = pd.DataFrame({
    'Initial_pH': [6.1], 
    'Initial_Brix': [11.0], 
    'Temperature': [30]
})

predicted_time = model.predict(new_sap_batch)
print(f"Input Data: pH={new_sap_batch['Initial_pH'][0]}, Brix={new_sap_batch['Initial_Brix'][0]}, Temp={new_sap_batch['Temperature'][0]}°C")
print(f"--> PREDICTED TIME UNTIL SPOILAGE: {predicted_time[0]:.1f} Hours")