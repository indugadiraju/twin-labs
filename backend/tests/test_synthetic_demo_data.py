"""Synthetic fixtures stay distinct, deterministic, and explicitly sourced."""

from backend.data.condition_configs import CONDITION_CONFIGS, DEFAULT_CONDITION
from backend.data.mock_predictions import mock_predicted_trajectory
from backend.data.synthetic_longitudinal_data import synthetic_weekly_states
from backend.data.synthetic_patient_profiles import DEMO_ARCHETYPES, generate_synthetic_baseline
from backend.data import store
from backend.data.trial_docs import TRIAL_ID
from backend.services.timeline_service import get_patient_journey
from backend.services.twin_service import create_patient_twin


def test_five_distinct_deterministic_stories():
    ids = list(DEMO_ARCHETYPES)
    stories = [synthetic_weekly_states(patient_id) for patient_id in ids]
    assert len({tuple((s['fatigue'], s['nausea'], s['sleep_quality']) for s in story) for story in stories}) == 5
    for patient_id, story in zip(ids, stories):
        assert len(story) == 5 and [s['week'] for s in story] == list(range(5))
        assert story == synthetic_weekly_states(patient_id)
        assert len({(s['fatigue'], s['nausea'], s['pain']) for s in story}) > 1
        assert all(s['source'] == 'synthetic' and set(s['labs']) >= {'hemoglobin_g_dl', 'wbc_10e9_l', 'platelets_10e9_l', 'creatinine_mg_dl', 'egfr_ml_min_1_73m2'} for s in story)


def test_improvement_worsening_fluctuation_and_concern():
    maya = synthetic_weekly_states('pt_demo_patient')
    anxiety = synthetic_weekly_states('pt_demo_anxiety')
    variable = synthetic_weekly_states('pt_demo_adherence')
    concern = synthetic_weekly_states('pt_demo_attention')
    assert maya[3]['fatigue'] > maya[1]['fatigue'] > maya[0]['fatigue']
    assert maya[4]['fatigue'] < maya[3]['fatigue']
    assert anxiety[4]['overall_wellbeing'] > anxiety[0]['overall_wellbeing']
    assert variable[1]['nausea'] > variable[2]['nausea'] < variable[3]['nausea']
    assert concern[3]['status'] == 'needs_attention' and concern[4]['status'] == 'stable'
    assert concern[3]['new_symptoms'] == ['Fever', 'Shortness of breath']


def test_treatment_patterns_and_state_driven_mock_risks():
    chemo = synthetic_weekly_states('pt_demo_patient')
    hormone = synthetic_weekly_states('pt_demo_hormone')
    assert max(s['nausea'] for s in chemo) > max(s['nausea'] for s in hormone)
    assert hormone[-1]['pain'] > hormone[0]['pain']
    assert chemo[2]['labs']['wbc_10e9_l'] < chemo[0]['labs']['wbc_10e9_l']
    maya = mock_predicted_trajectory('pt_demo_patient')
    assert maya == mock_predicted_trajectory('pt_demo_patient')
    assert maya[1]['prediction']['nausea'] > maya[-1]['prediction']['nausea']
    assert maya[2]['prediction']['fatigue'] > maya[-1]['prediction']['fatigue']
    variable = mock_predicted_trajectory('pt_demo_adherence')
    assert variable[-1]['prediction']['dropout_risk'] > variable[0]['prediction']['dropout_risk']
    concern = mock_predicted_trajectory('pt_demo_attention')
    assert concern[2]['prediction']['adverse_event'] > concern[1]['prediction']['adverse_event']
    assert all(p['source'] == 'mock' for p in concern)


def test_multiple_condition_configs_and_provenance():
    assert len(CONDITION_CONFIGS) >= 3
    profiles = [generate_synthetic_baseline('test', condition) for condition in CONDITION_CONFIGS]
    assert all(p['is_synthetic'] and p['source'] == 'synthetic' and p['condition_specific'] for p in profiles)
    assert all(profiles[0]['condition_specific'] != p['condition_specific'] for p in profiles[1:])
    assert all(len(synthetic_weekly_states('test', profile)) == 5 for profile in profiles)
    store.reset()
    create_patient_twin(TRIAL_ID, patient_id='pt_demo_patient', condition=DEFAULT_CONDITION)
    timeline = get_patient_journey('pt_demo_patient')
    assert timeline['trial']['nct_id'] == 'NCT00310180'
    assert timeline['data_sources']['trial_info'].startswith('real')
    assert timeline['data_sources']['weekly_states'].startswith('synthetic')
    assert timeline['data_sources']['visit_schedule'] == 'simulated_for_demo'
    assert timeline['data_sources']['predictions'] == 'mock'
    assert all(w['checkin'] is None and w['synthetic_state']['source'] == 'synthetic' and w['prediction']['source'] == 'mock' for w in timeline['weeks'])
    store.reset()
