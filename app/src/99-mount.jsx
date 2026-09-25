
  ReactDOM.createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
} catch(_e) {
  document.getElementById('root').innerHTML =
    '<pre style="color:#fa0;background:#1a0000;padding:20px;font-size:13px;border:2px solid red;margin:12px;border-radius:8px;white-space:pre-wrap">'
    + 'INIT CRASH:\n' + String(_e) + '\n\n' + (_e && _e.stack ? _e.stack : '')
    + '</pre>';
}
