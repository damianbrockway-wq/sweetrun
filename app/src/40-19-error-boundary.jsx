class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding:20, background:'#1a0000', border:'2px solid #f85149', borderRadius:12, margin:20, color:'#ff6b6b' }}>
          <h2 style={{ color:'#f85149', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}><I.alert size={20} color="#f85149" /> App Error</h2>
          <pre style={{ whiteSpace:'pre-wrap', fontSize:12, color:'#ccc' }}>{String(this.state.error)}</pre>
          <pre style={{ whiteSpace:'pre-wrap', fontSize:13, color:'#888', marginTop:10 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

