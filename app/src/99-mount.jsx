
  // Which shell: app/look.js decided before first paint and put it on <html data-look>.
  // Anything but an explicit 'new' falls back to the classic App, so a missing or
  // failed look.js can never strand a customer on an unfinished shell.
  const SR_LOOK = (window.srLook && window.srLook.current === 'new') ? 'new' : 'classic';
  const SR_SHELL = SR_LOOK === 'new' ? RunSheetApp : App;
  ReactDOM.createRoot(document.getElementById('root')).render(<AppErrorBoundary><SR_SHELL /></AppErrorBoundary>);
} catch(_e) {
  document.getElementById('root').innerHTML =
    '<pre style="color:#fa0;background:#1a0000;padding:20px;font-size:13px;border:2px solid red;margin:12px;border-radius:8px;white-space:pre-wrap">'
    + 'INIT CRASH:\n' + String(_e) + '\n\n' + (_e && _e.stack ? _e.stack : '')
    + '</pre>';
}
