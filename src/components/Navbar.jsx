import { useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleUserRound, LogOut, UserRound } from 'lucide-react';

function Navbar({ user, onLogin, onSignUp, onLogout, onNavigateToProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const accountRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const openFrameRef = useRef(null);
  const menuId = 'navbar-account-menu';

  useEffect(() => {
    return () => {
      window.clearTimeout(closeTimerRef.current);
      window.cancelAnimationFrame(openFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuMounted) return undefined;

    function closeOnOutsideClick(event) {
      if (!accountRef.current?.contains(event.target)) closeMenu();
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuMounted]);

  function openMenu() {
    window.clearTimeout(closeTimerRef.current);
    window.cancelAnimationFrame(openFrameRef.current);
    setMenuMounted(true);
    openFrameRef.current = window.requestAnimationFrame(() => setMenuOpen(true));
  }

  function closeMenu() {
    window.cancelAnimationFrame(openFrameRef.current);
    setMenuOpen(false);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setMenuMounted(false), 250);
  }

  function selectMenuOption(callback) {
    closeMenu();
    callback?.();
  }

  return (
    <header className="navbar">
      <a href="#" className="logo">
        <span className="logo-icon">
          <span className="logo-plus">+</span>
        </span>
        Clínica Saúde
      </a>

      <nav className="nav-links">
        <a href="#inicio">Início</a>
        <a href="#servicos">Serviços</a>
        <a href="#sobre">Sobre</a>
      </nav>

      <div className="navbar-actions">
        {!user && (
          <>
            <button type="button" className="signup-button" onClick={onSignUp}>
              Criar conta
            </button>
            <button type="button" className="navbar-account-trigger" onClick={onLogin}>
              <UserRound size={18} aria-hidden="true" />
              <span>Fazer login</span>
            </button>
          </>
        )}
        {user && (
          <div className="navbar-account" ref={accountRef}>
            <button
              ref={triggerRef}
              type="button"
              className="navbar-account-trigger"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => (menuOpen ? closeMenu() : openMenu())}
            >
              <CircleUserRound size={18} aria-hidden="true" />
              <span>Olá, {user.full_name}</span>
              <ChevronDown className={menuOpen ? 'is-open' : ''} size={16} aria-hidden="true" />
            </button>
            {menuMounted && (
              <div
                className={`navbar-account-menu${menuOpen ? ' is-open' : ''}`}
                id={menuId}
                aria-label="Menu da conta"
                aria-hidden={!menuOpen}
                inert={!menuOpen}
                onTransitionEnd={(event) => {
                  if (event.target === event.currentTarget && event.propertyName === 'opacity' && !menuOpen) {
                    window.clearTimeout(closeTimerRef.current);
                    setMenuMounted(false);
                  }
                }}
              >
                <button type="button" onClick={() => selectMenuOption(onNavigateToProfile)}>
                  <UserRound size={16} aria-hidden="true" />
                  Meu perfil
                </button>
                <button type="button" className="navbar-account-logout" onClick={() => selectMenuOption(onLogout)}>
                  <LogOut size={16} aria-hidden="true" />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
