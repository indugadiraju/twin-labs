from backend.data.mock_predictions import mock_predicted_trajectory, predict_week


def test_predict_week_returns_expected_demo_shape():
    patient = {
        "patient_id": "demo-123",
        "condition": "Hormone-receptor-positive, HER2-negative breast cancer (node-negative)",
        "synthetic_baseline": {
            "baseline_fatigue": 4,
            "baseline_nausea": 2,
            "baseline_pain": 2,
            "sleep_hours_per_night": 6.0,
        },
    }

    result = predict_week(patient, "Chemotherapy (TC regimen) followed by hormone therapy", 2)

    assert result["week"] == 2
    for key in [
        "fatigue",
        "nausea",
        "adverse_event",
        "dropout_risk",
        "pain",
        "sleep_disruption",
        "uncertainty",
    ]:
        assert key in result
        assert 0.0 <= result[key] <= 1.0

    assert "condition_specific_risks" in result
    assert "neuropathy" in result["condition_specific_risks"]
    assert 0.0 <= result["condition_specific_risks"]["neuropathy"] <= 1.0


def test_mock_predicted_trajectory_returns_weekly_predictions():
    trajectory = mock_predicted_trajectory("demo-patient", weeks=4)

    assert len(trajectory) == 4
    assert all("week" in entry and "mock_risk_score" in entry for entry in trajectory)
    assert all(0.0 <= entry["mock_risk_score"] <= 1.0 for entry in trajectory)
