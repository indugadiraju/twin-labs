export default function PatientBaseline({ baseline }) {
  if (!baseline) {
    return (
      <div className="card">
        <h2>Patient Profile</h2>
        <p>No baseline yet — create a twin to get started.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="row-between">
        <h2>Patient Profile</h2>
        <span className="tag source-synthetic">Synthetic (demo)</span>
      </div>
      <p className="muted small">
        Fabricated for this demo — not a real patient, and not drawn from any public dataset.
      </p>

      <dl className="profile-grid">
        <dt>Age</dt>
        <dd>{baseline.age}</dd>

        <dt>Condition</dt>
        <dd>{baseline.condition}</dd>

        <dt>Treatment</dt>
        <dd>{baseline.treatment}</dd>

        <dt>Dose</dt>
        <dd>{baseline.dose}</dd>

        <dt>Kidney function</dt>
        <dd>{baseline.kidney_function.egfr_ml_min_1_73m2} mL/min/1.73m² (eGFR)</dd>

        <dt>Labs</dt>
        <dd>
          Hgb {baseline.labs.hemoglobin_g_dl} g/dL · WBC {baseline.labs.wbc_10e9_l} ×10⁹/L · Platelets{' '}
          {baseline.labs.platelets_10e9_l} ×10⁹/L · Creatinine {baseline.labs.creatinine_mg_dl} mg/dL
        </dd>

        <dt>Baseline symptoms</dt>
        <dd>
          Fatigue {baseline.baseline_fatigue}/10 · Nausea {baseline.baseline_nausea}/10 · Pain{' '}
          {baseline.baseline_pain}/10
        </dd>

        <dt>Sleep</dt>
        <dd>{baseline.sleep_hours_per_night} hrs/night</dd>

        <dt>Tumor size</dt>
        <dd>{baseline.condition_specific.tumor_size_cm} cm</dd>

        <dt>Receptor status</dt>
        <dd>
          {baseline.condition_specific.hormone_receptor_status}, HER2 {baseline.condition_specific.her2_status}
        </dd>

        <dt>Nodes</dt>
        <dd>{baseline.condition_specific.node_status}</dd>

        <dt>Oncotype DX score</dt>
        <dd>{baseline.condition_specific.oncotype_dx_recurrence_score}</dd>
      </dl>
    </div>
  )
}
