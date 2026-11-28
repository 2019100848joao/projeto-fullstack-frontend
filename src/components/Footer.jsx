import { HeartPulse } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer">
      <div>
        <a href="#" className="logo">
          <span className="logo-icon">
            <HeartPulse size={20} aria-hidden="true" />
          </span>
          Clínica Saúde
        </a>

        <p>
          Tecnologia a serviço de um atendimento mais humano.
        </p>
      </div>

      <span className="footer-copy">
        © 2026 Clínica Saúde. Projeto acadêmico.
      </span>
    </footer>
  )
}

export default Footer