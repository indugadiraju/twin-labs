"""Fabricated condition configurations for the disease-independent demo schema."""

DEFAULT_CONDITION = "Hormone-receptor-positive, HER2-negative breast cancer (node-negative)"
LUNG_CONDITION = "Non-small cell lung cancer"
RA_CONDITION = "Rheumatoid arthritis"

CONDITION_CONFIGS = {
    DEFAULT_CONDITION: {
        "treatments": [
            {"treatment": "Tamoxifen (hormone therapy alone)", "dose": "20 mg oral, once daily"},
            {"treatment": "Anastrozole (aromatase inhibitor, hormone therapy alone)", "dose": "1 mg oral, once daily"},
            {"treatment": "Chemotherapy (TC regimen) followed by hormone therapy", "dose": "Docetaxel 75 mg/m^2 + Cyclophosphamide 600 mg/m^2, IV, every 3 weeks x4"},
        ],
        "symptom_dimensions": ["fatigue", "nausea", "pain", "sleep_quality", "anxiety"],
        "risk_fields": ["neuropathy", "treatment_related_fatigue"],
        "condition_specific": {"tumor_size_cm": 2.1, "hormone_receptor_status": "ER+/PR+", "her2_status": "negative", "node_status": "node-negative", "recurrence_score": 18, "oncotype_dx_recurrence_score": 18},
    },
    LUNG_CONDITION: {
        "treatments": [{"treatment": "Demo systemic therapy", "dose": "Synthetic treatment placeholder"}, {"treatment": "Demo observation pathway", "dose": "Synthetic treatment placeholder"}],
        "symptom_dimensions": ["fatigue", "breathlessness", "cough", "appetite"],
        "risk_fields": ["breathlessness_signal", "cough_signal"],
        "condition_specific": {"stage": "II", "histology": "adenocarcinoma", "smoking_history": "former", "performance_status": 1, "biomarker_status": "demo unknown"},
    },
    RA_CONDITION: {
        "treatments": [{"treatment": "Demo DMARD pathway", "dose": "Synthetic treatment placeholder"}, {"treatment": "Demo symptom monitoring", "dose": "Synthetic treatment placeholder"}],
        "symptom_dimensions": ["pain", "fatigue", "mobility", "morning_stiffness"],
        "risk_fields": ["joint_activity_signal", "mobility_signal"],
        "condition_specific": {"disease_activity_score": 3.8, "swollen_joint_count": 4, "tender_joint_count": 6, "crp_mg_l": 9, "morning_stiffness_minutes": 45},
    },
}

# Backwards-compatible treatment map; all values are synthetic demo configuration.
BASELINE_CONDITIONS = {name: config["treatments"] for name, config in CONDITION_CONFIGS.items()}
