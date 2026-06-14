import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Upload Documents' },
  { path: '/match', label: 'Match Status' },
];

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="brand-accent">Three-Way</span> Match Engine
      </div>
      <nav className="navbar-links">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Navbar;
