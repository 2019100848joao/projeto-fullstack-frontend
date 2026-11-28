import { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/auth.js';
import SuccessToast from '../../components/SuccessToast.jsx';
import RoleRequestCard from '../RoleTransitions/RoleRequestCard.jsx';

const roleNames = {
  admin: 'Administração',
  attendant: 'Atendimento',
  doctor: 'Médico',
  patient: 'Paciente',
};

function maskDocument(value) {
  const characters = Array.from(String(value || ''));
  const visibleCount = Math.min(2, characters.length);
  return `${'•'.repeat(Math.max(0, characters.length - visibleCount))}${characters.slice(-visibleCount).join('')}`;
}

export default function Profile({ user }) {
  const { registerDocument } = useAuth();
  const [documentType, setDocumentType] = useState('CPF');
  const [documentValue, setDocumentValue] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState(null);

  const documents = useMemo(() => {
    const saved = { CPF: [], RG: [] };
    (user.documents || []).forEach((document) => {
      const type = String(document.document_type?.type || '').trim().toLocaleUpperCase('pt-BR');
      if (type === 'CPF' || type === 'RG') saved[type].push(document);
    });
    return saved;
  }, [user.documents]);

  const hasDocument = documents.CPF.length > 0 || documents.RG.length > 0;

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const value = documentType === 'CPF' ? documentValue.replace(/\D/g, '') : documentValue.trim();
    if (!value) {
      setError('Informe o documento escolhido.');
      return;
    }
    if (documentType === 'CPF' && value.length !== 11) {
      setError('O CPF deve conter 11 números.');
      return;
    }
    if (documentType === 'RG' && value.length > 255) {
      setError('O RG deve ter no máximo 255 caracteres.');
      return;
    }

    setError('');
    setPending(true);
    try {
      await registerDocument([{ type: documentType, value }]);
      setDocumentValue('');
      setToast({ id: Date.now(), message: 'Etapa documental concluída com sucesso.', variant: 'profile' });
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar o documento.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="dashboard-content" aria-labelledby="profile-title">
        <div className="dashboard-page-heading">
          <span className="dashboard-eyebrow">CONTA</span>
          <h1 id="profile-title">Meu perfil</h1>
          <p>Consulte seus dados e a situação dos documentos cadastrados.</p>
        </div>

        <div className="dashboard-account-card">
          <span className="dashboard-card-label">DADOS PESSOAIS</span>
          <h2>Seus dados</h2>
          <dl>
            <div><dt>Nome completo</dt><dd>{user.full_name}</dd></div>
            <div><dt>E-mail</dt><dd>{user.email}</dd></div>
            <div><dt>Papel da conta</dt><dd>{roleNames[user.role] || 'Usuário'}</dd></div>
          </dl>
        </div>

        <div className="dashboard-account-card">
          <span className="dashboard-card-label">DOCUMENTOS</span>
          <h2>Situação documental</h2>
          {hasDocument ? (
            <>
              <p className="profile-document-status">Etapa documental concluída.</p>
              <dl>
                {['CPF', 'RG'].flatMap((type) => documents[type].map((document) => (
                  <div key={document.id}>
                    <dt>{type}</dt>
                    <dd aria-label={`${type} terminado em ${String(document.value || '').slice(-2)}`}>
                      {maskDocument(document.value)}
                    </dd>
                  </div>
                )))}
              </dl>
            </>
          ) : (
            <>
              <p className="profile-document-status">Cadastre CPF ou RG para concluir esta etapa. Basta cadastrar um documento.</p>
              <form onSubmit={submit} aria-busy={pending}>
                <fieldset className="profile-document-choice" disabled={pending}>
                  <legend>Escolha o documento</legend>
                  {['CPF', 'RG'].map((type) => (
                    <label key={type}>
                      <input
                        type="radio"
                        name="document-type"
                        value={type}
                        checked={documentType === type}
                        onChange={() => {
                          setDocumentType(type);
                          setDocumentValue('');
                          setError('');
                        }}
                      />
                      {type}
                    </label>
                  ))}
                </fieldset>
                <div className="field">
                  <label htmlFor="profile-document-value">{documentType}</label>
                  <input
                    id="profile-document-value"
                    value={documentValue}
                    onChange={(event) => {
                      const value = documentType === 'CPF' ? event.target.value.replace(/\D/g, '') : event.target.value;
                      setDocumentValue(value);
                      setError('');
                    }}
                    inputMode={documentType === 'CPF' ? 'numeric' : 'text'}
                    maxLength={documentType === 'CPF' ? 11 : 255}
                    autoComplete="off"
                    disabled={pending}
                    required
                  />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" type="submit" disabled={pending}>
                  {pending ? 'Salvando...' : 'Cadastrar documento'}
                </button>
              </form>
            </>
          )}
        </div>

        {user.role !== 'admin' && <RoleRequestCard user={user} />}
      </section>
      {toast && <SuccessToast key={toast.id} message={toast.message} variant={toast.variant} />}
    </>
  );
}
