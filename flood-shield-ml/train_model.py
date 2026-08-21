import numpy as np
import xgboost as xgb
import json
import os

def generate_synthetic_data(num_samples=5000):
    np.random.seed(42)
    
    # Coordinates roughly covering Bangladesh (Lat: 20.5 to 26.5, Lon: 88.0 to 92.5)
    lats = np.random.uniform(20.5, 26.5, num_samples)
    lons = np.random.uniform(88.0, 92.5, num_samples)
    
    # Elevation: generally lower in south/central (0-10m), higher in north/northeast/southeast (15-80m)
    # We will correlate elevation loosely with latitude (further north/hilly is higher) and longitude (east is higher)
    elevations = np.random.exponential(scale=15, size=num_samples) + 2
    # Ensure some low-lying areas
    elevations = np.clip(elevations, 1, 100)
    
    # Current rainfall (0 to 80 mm)
    current_precip = np.random.exponential(scale=10, size=num_samples)
    
    # 24h Forecast (0 to 180 mm) - correlated with current precip
    forecast_24h = current_precip * np.random.uniform(1.2, 2.5, num_samples) + np.random.exponential(scale=15, size=num_samples)
    
    # 72h Forecast (0 to 350 mm)
    forecast_72h = forecast_24h * np.random.uniform(1.5, 3.0, num_samples) + np.random.exponential(scale=30, size=num_samples)
    
    # Distance to river in km (0 to 50 km) - lower distance = higher hazard
    dist_to_river = np.random.exponential(scale=8, size=num_samples)
    dist_to_river = np.clip(dist_to_river, 0.1, 50.0)
    
    # Define rules for ground truth label 'is_flooded'
    # Flood is highly likely if:
    # 1. Low elevation (< 15m) AND high 72h rainfall (> 100mm)
    # 2. Very close to river (< 3km) AND moderate 24h rainfall (> 40mm)
    # 3. Critical cloudburst (72h rainfall > 250mm) regardless of elevation
    # 4. Northeast flash flood zone (Sylhet/Sunamganj: Lat 24.5-25.5, Lon 91.0-92.5) with low elevation (< 20m) and 24h rain (> 50mm)
    
    # Score-based probabilistic modeling
    score = (
        (100 - elevations) * 0.3 + 
        (forecast_72h / 3.0) * 0.4 + 
        (30 - dist_to_river) * 0.2 +
        current_precip * 0.1
    )
    
    # Northeast flash flood factor
    ne_mask = (lats >= 24.5) & (lats <= 25.5) & (lons >= 91.0) & (lons <= 92.5)
    score[ne_mask] += 25  # Sylhet/Sunamganj high vulnerability bump
    
    # Normalize score and add some noise
    score = (score - score.min()) / (score.max() - score.min())
    score += np.random.normal(0, 0.05, num_samples)
    
    is_flooded = (score > 0.6).astype(int)
    
    X = np.stack([lats, lons, elevations, current_precip, forecast_24h, forecast_72h, dist_to_river], axis=1)
    y = is_flooded
    
    return X, y

def train_and_save():
    print("Generating synthetic dataset based on Sen1Floods11 & NASA DEM parameters...")
    X, y = generate_synthetic_data(10000)
    
    # Split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print("Training XGBoost prediction classifier...")
    # Train
    model = xgb.XGBClassifier(
        max_depth=5,
        learning_rate=0.1,
        n_estimators=100,
        objective='binary:logistic',
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)
    print(f"Model trained successfully. Train Accuracy: {train_acc:.4f}, Test Accuracy: {test_acc:.4f}")
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'flood_xgb_model.json')
    model.save_model(model_path)
    print(f"XGBoost model saved to {model_path}")
    
    # Save feature configuration for sanity checking
    meta_path = os.path.join(os.path.dirname(__file__), 'model_metadata.json')
    meta = {
        "features": ["latitude", "longitude", "elevation", "current_precip", "forecast_24h", "forecast_72h", "dist_to_river"],
        "accuracy": test_acc
    }
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print("Metadata written.")

if __name__ == '__main__':
    train_and_save()
