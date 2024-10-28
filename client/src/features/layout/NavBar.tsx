import { memo } from "react";
import { NavLink } from "react-router-dom";
import HomeIcon from "../../components/icons/HomeIcon";

const NavBar = () => {
  return (
    <nav role="navigation" aria-label="Main Navigation">
      <NavLink
        to="/"
        className={({ isActive }) => (isActive ? "active" : "")}
        aria-label="Home"
      >
        <HomeIcon />
      </NavLink>
    </nav>
  );
};

export default memo(NavBar);
