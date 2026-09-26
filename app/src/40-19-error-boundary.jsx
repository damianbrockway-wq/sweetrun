// ─── Crash screen ──────────────────────────────────────────────────────────────
// Shown only if a screen throws while rendering. Run Sheet tokens (.rs-crash in
// runsheet.css); the error text stays so a screenshot of it can be debugged.
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rs-crash" role="alert">
          <h1><RsIcon name="alert" size={26} sw={2.4} /> SweetRun hit a problem</h1>
          <p>Your entries are safe on this device. Reload the app to carry on. If it happens again, send a screenshot of this screen.</p>
          <button type="button" className="rs-btn" onClick={() => location.reload()}>Reload SweetRun</button>
          <pre>{String(this.state.error)}{this.state.error && this.state.error.stack ? '\n\n' + this.state.error.stack : ''}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
