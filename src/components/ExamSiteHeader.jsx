import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../assets/iiae/IIAE-LOGO.png';

const SITE = 'https://www.iiae.in';

const MAIN_NAV = [
  { label: 'Home', href: `${SITE}/` },
  { label: 'Degrees & Programs', href: `${SITE}/degree` },
  {
    label: 'Admission',
    href: `${SITE}/admission`,
    children: [
      { label: 'Admission', href: `${SITE}/admission` },
      { label: 'AIAEE Important Dates', href: `${SITE}/important-dates-for-aiaee` },
    ],
  },
  { label: 'Research', href: `${SITE}/research-at-iiae` },
  { label: 'Partnerships', href: `${SITE}/partnerships` },
  {
    label: 'About Us',
    href: `${SITE}/about-us`,
    children: [
      { label: 'About Us IIAE', href: `${SITE}/about-us` },
      { label: 'FAQ', href: `${SITE}/faq` },
      { label: 'Career', href: `${SITE}/career-growth` },
      { label: 'Placements', href: `${SITE}/placements` },
    ],
  },
  { label: 'Newsroom', href: `${SITE}/newsroom` },
  { label: 'Blog', href: `${SITE}/blog` },
  { label: 'Contact Us', href: `${SITE}/contact-us` },
];

const ExamSiteHeader = ({ siteNavFromHeader, onApply }) => {
  const navigate = useNavigate();
  const apply = onApply || (() => navigate('/apply-now'));
  const [navOpen, setNavOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const navRef = useRef(null);
  const topHeaderRef = useRef(null);

  const toggleSiteNav = () => {
    setNavOpen((open) => !open);
    setOpenDropdown(null);
  };

  const closeSiteNav = () => {
    setNavOpen(false);
    setOpenDropdown(null);
  };

  useEffect(() => {
    const onDocClick = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 991.98px)');
    const onBreakpoint = () => {
      if (!media.matches) closeSiteNav();
    };
    media.addEventListener('change', onBreakpoint);
    return () => media.removeEventListener('change', onBreakpoint);
  }, []);

  useEffect(() => {
    if (!navOpen) {
      document.body.style.overflow = '';
      return undefined;
    }
    const header = topHeaderRef.current;
    if (header) {
      document.documentElement.style.setProperty('--exam-header-offset', `${header.offsetHeight}px`);
    }
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSiteNav();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  const toggleDropdown = (label, event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDropdown((current) => (current === label ? null : label));
  };

  const headerClass = [
    'exam-main-header',
    siteNavFromHeader ? 'exam-header-has-site-nav-menu' : '',
    navOpen ? 'exam-header-nav-open' : '',
  ].filter(Boolean).join(' ');

  const renderNavItems = (interactive) => MAIN_NAV.map((item) => {
    const dropdownOpen = openDropdown === item.label;
    const closeIfInteractive = interactive ? closeSiteNav : undefined;

    if (item.children) {
      return (
        <li
          key={item.label}
          className={`exam-site-nav-item${dropdownOpen ? ' is-expanded' : ''} has-dropdown`}
          onMouseEnter={() => !interactive && setOpenDropdown(item.label)}
          onMouseLeave={() => !interactive && setOpenDropdown(null)}
        >
          <button
            type="button"
            className="exam-site-nav-link exam-site-nav-dropdown-toggle"
            aria-expanded={dropdownOpen}
            onClick={(event) => toggleDropdown(item.label, event)}
          >
            <span>{item.label}</span>
            <i className="fa-solid fa-chevron-down exam-site-nav-chevron" aria-hidden="true" />
          </button>
          <ul className={`exam-site-nav-dropdown${dropdownOpen ? ' is-open' : ''}`}>
            {item.children.map((child) => (
              <li key={child.href}>
                <a href={child.href} className="exam-site-nav-dropdown-item" onClick={closeIfInteractive}>
                  {child.label}
                </a>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return (
      <li key={item.label} className="exam-site-nav-item">
        <a href={item.href} className="exam-site-nav-link" onClick={closeIfInteractive}>
          <span>{item.label}</span>
        </a>
      </li>
    );
  });

  const mobileOverlay = navOpen
    ? createPortal(
      <div
        className="exam-mobile-nav-overlay is-visible"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <button
          type="button"
          className="exam-mobile-nav-backdrop"
          onClick={closeSiteNav}
          aria-label="Close menu"
        />
        <div className="exam-mobile-nav-panel" id="exam-site-nav-panel">
          <div className="exam-mobile-nav-head">
            <p className="exam-mobile-nav-title">Menu</p>
            <p className="exam-mobile-nav-sub">Indian Institute of Aircraft Engineering</p>
          </div>

          <div className="exam-mobile-nav-scroll">
            <ul className="exam-site-nav-list exam-site-nav-list--overlay">
              {renderNavItems(true)}
              <li className="exam-site-nav-item exam-site-nav-item--login">
                <Link to="/login" className="exam-site-nav-link" onClick={closeSiteNav}>
                  <i className="fa-solid fa-user exam-site-nav-link-icon" aria-hidden="true" />
                  <span>Student Login</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="exam-mobile-nav-foot">
            <button type="button" className="exam-mobile-nav-apply" onClick={() => { closeSiteNav(); apply(); }}>
              <i className="fa-solid fa-check-to-slot" aria-hidden="true" />
              Apply Now
            </button>
            <a href="tel:+91-84484-88194" className="exam-mobile-nav-phone">
              <i className="fa-solid fa-phone" aria-hidden="true" />
              +91 8448488194
            </a>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <header className={headerClass}>
      <div className="exam-top-header" ref={topHeaderRef}>
        <div className="exam-top-row">
          <div className="exam-logo-col">
            {siteNavFromHeader && (
              <button
                type="button"
                onClick={toggleSiteNav}
                className="exam-menu-btn"
                aria-expanded={navOpen}
                aria-controls="exam-site-nav-panel"
                aria-label={navOpen ? 'Close menu' : 'Open menu'}
              >
                <i className={`fa-solid ${navOpen ? 'fa-xmark' : 'fa-bars'}`} />
              </button>
            )}
            <a href={SITE}>
              <img src={BrandLogo} alt="IIAE" className="exam-brand-logo" />
            </a>
          </div>
          <div className="exam-title-col">
            <strong>
              INDIAN INSTITUTE OF
              <br />
              AIRCRAFT ENGINEERING
            </strong>
          </div>
          <button type="button" onClick={apply} className="exam-mobile-apply">
            <i className="fa-solid fa-check-to-slot" /> Apply Now
          </button>
          <div className="exam-links-col">
            <div className="head-right-link">
              <ul className="exam-list-top exam-desktop-links">
                <li><a href={`${SITE}/request-information`}><i className="fa-solid fa-circle-info" /> Request Info</a></li>
                <li><a href={`${SITE}/contact-us`}><i className="fa-solid fa-at" /> Contact Us</a></li>
                <li><button type="button" onClick={apply}><i className="fa-solid fa-check-to-slot" /> Apply Now</button></li>
                <li><a href={`${SITE}/newsroom`}><i className="fa-solid fa-newspaper" /> Newsroom</a></li>
              </ul>
              <ul className="exam-phone-menu">
                <li><a href="tel:+91-84484-88194"><i className="fa-solid fa-phone" /> +91 8448488194</a></li>
                <li><a href="tel:+91-98702-90573"><i className="fa-solid fa-phone" /> +91 9870290573</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <nav className="exam-site-nav exam-site-nav--bar" ref={navRef} aria-label="Main">
        <div className="exam-site-nav-inner">
          <button
            type="button"
            className="exam-site-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="exam-site-nav-panel"
            onClick={toggleSiteNav}
          >
            <i className="fa-solid fa-bars" aria-hidden="true" />
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>

          <div className="exam-site-nav-collapse exam-site-nav-collapse--desktop">
            <ul className="exam-site-nav-list">
              {renderNavItems(false)}
              <li className="exam-site-nav-item exam-site-nav-item--login">
                <Link to="/login" className="exam-site-nav-link">
                  <i className="fa-solid fa-user exam-site-nav-link-icon" aria-hidden="true" />
                  <span>Student Login</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {mobileOverlay}
    </header>
  );
};

export default ExamSiteHeader;
