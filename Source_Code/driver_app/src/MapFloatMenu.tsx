type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEditRoute: () => void;
  onLogOut: () => void;
};

export function MapFloatMenu({ open, onToggle, onClose, onEditRoute, onLogOut }: Props) {
  return (
    <div className="map-float-menu-wrap">
      <button
        type="button"
        className={`map-float-menu${open ? " map-float-menu--open" : ""}`}
        onClick={onToggle}
        title="Menu"
        aria-label="Menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        ☰
      </button>
      {open && (
        <>
          <button type="button" className="map-menu-backdrop" aria-label="Close menu" onClick={onClose} />
          <nav className="map-float-menu-panel" aria-label="Map menu">
            <button
              type="button"
              className="map-float-menu-item"
              onClick={() => {
                onClose();
                onEditRoute();
              }}
            >
              Edit route
            </button>
            <button
              type="button"
              className="map-float-menu-item map-float-menu-item--logout"
              onClick={() => {
                onClose();
                onLogOut();
              }}
            >
              Log out
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
