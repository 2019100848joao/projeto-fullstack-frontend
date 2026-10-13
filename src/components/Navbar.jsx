function Navbar({ onLogin }) {
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

      <button type="button" className="login-button" onClick={onLogin}>
        Entrar
      </button>
    </header>
  )
}

export default Navbar
