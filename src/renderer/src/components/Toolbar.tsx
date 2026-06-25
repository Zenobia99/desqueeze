import React from 'react'

// A thin draggable title bar: clears the OS traffic lights and lets the window
// be dragged. The view toggle moved to the Inspector and search was removed, so
// this no longer hosts controls.
function Toolbar() {
  return (
    <div
      className="dq-drag"
      style={{
        height: 34,
        flex: 'none',
        background: 'linear-gradient(#fbfbfc,#f1f1f3)',
        borderBottom: '0.5px solid #d8d8db'
      }}
    />
  )
}

export default React.memo(Toolbar)
