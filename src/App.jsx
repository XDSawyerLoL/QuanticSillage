import { motion } from 'framer-motion'
import {
  ArrowRight,
  BrainCircuit,
  Chrome,
  Compass,
  DatabaseZap,
  Eye,
  Fingerprint,
  FlaskConical,
  Globe2,
  Layers3,
  Menu,
  Orbit,
  ShieldCheck,
  Sparkles,
  X,
  Search,
  LockKeyhole,
  Mail,
  MessageCircle,
  Newspaper,
  Github,
  ExternalLink,
  Gauge,
  Wifi,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

const projects = [
  {
    name: 'QuanticOS',
    kicker: 'Système agentique',
    copy: 'Un environnement pensé autour des objectifs, des intentions et des agents — pas seulement autour des applications.',
    status: 'Prototype avancé',
    icon: Orbit,
  },
  {
    name: 'Quantic Glide',
    kicker: 'Navigation privée',
    copy: 'Un navigateur natif orienté contrôle, fluidité, confidentialité et portabilité, construit sans Chromium autour du moteur hybride Gecko / Ladybird / Servo.',
    status: 'En développement',
    icon: Chrome,
    portal: true,
  },
  {
    name: 'Providence',
    kicker: 'Prospective probabiliste',
    copy: 'Un moteur qui transforme des signaux dispersés en scénarios suivis dans le temps. Probabilités, jamais certitudes.',
    status: 'Expérimentation active',
    icon: Compass,
  },
  {
    name: 'Aura',
    kicker: 'IA personnelle',
    copy: 'Une exploration autour d’une intelligence plus contextuelle, continue et naturelle dans la vie numérique.',
    status: 'Recherche produit',
    icon: BrainCircuit,
  },
  {
    name: 'ESSOR',
    kicker: 'Progression & accompagnement',
    copy: 'Un produit numérique centré sur la progression, la clarté et l’accompagnement dans la durée.',
    status: 'Produit',
    icon: Layers3,
  },
  {
    name: 'SWAPP.TV',
    kicker: 'Découverte de contenus',
    copy: 'Une expérimentation autour de nouvelles expériences de découverte, de sélection et de consommation de contenus.',
    status: 'Concept produit',
    icon: Eye,
  },
]

const minds = [
  {
    name: 'Maya Loren',
    role: 'Applied AI Research',
    quote: 'Des agents utiles commencent par comprendre le contexte avant d’agir.',
    initials: 'ML',
    hue: 'blue',
  },
  {
    name: 'Elias Morel',
    role: 'Product & Systems Design',
    quote: 'Un système complexe doit produire une expérience simple.',
    initials: 'EM',
    hue: 'violet',
  },
  {
    name: 'Nora Vidal',
    role: 'Human Experience & Adoption',
    quote: 'Une innovation qui n’est pas adoptée reste une démonstration.',
    initials: 'NV',
    hue: 'gold',
  },
  {
    name: 'Adam Kerr',
    role: 'Privacy & Infrastructure',
    quote: 'Le contrôle utilisateur doit exister avant que l’automatisation commence.',
    initials: 'AK',
    hue: 'cyan',
  },
  {
    name: 'Kenji Sato',
    role: 'Intelligent Systems Engineering',
    quote: 'Les meilleurs systèmes savent quand agir — et quand s’arrêter.',
    initials: 'KS',
    hue: 'silver',
  },
]

const research = [
  ['Agents IA', 'Délégation contrôlée, mémoire contextuelle et orchestration.'],
  ['Vie privée', 'Architectures locales, contrôle des données et autonomie numérique.'],
  ['Intentions', 'Des interfaces qui comprennent davantage l’objectif que le clic.'],
  ['Prospective', 'Scénarios probabilistes, signaux faibles et aide à la décision.'],
  ['Adoption', 'Réduire la friction jusqu’à rendre la technologie presque invisible.'],
]

function Logo({ compact = false }) {
  return (
    <div className={`logo-lockup ${compact ? 'compact' : ''}`}>
      <svg className="brand-mark" viewBox="0 0 88 88" aria-hidden="true">
        <path d="M42 7 13 24v40l29 17" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
        <path d="M43 26 28 35v24l15 9" fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" opacity=".9" />
        <path d="M47 30 61 22l15 9v18L61 58v14L45 81" fill="none" stroke="url(#qmBlue)" strokeWidth="8" strokeLinejoin="round" />
        <defs>
          <linearGradient id="qmBlue" x1="43" y1="20" x2="79" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6BE7FF" />
            <stop offset="1" stopColor="#0A6BFF" />
          </linearGradient>
        </defs>
      </svg>
      {!compact && (
        <div className="wordmark"><span>QUANTIC</span><strong>MINDS</strong></div>
      )}
    </div>
  )
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="section-heading">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}


const glideShortcuts = [
  { id: 'aura', name: 'AURA', sub: 'Company OS', icon: BrainCircuit, tone: 'violet' },
  { id: 'mail', name: 'Quantic Mail', sub: 'Messagerie privée', icon: Mail, tone: 'cyan' },
  { id: 'zoon', name: 'ZOON', sub: 'Réseau social', icon: MessageCircle, tone: 'gold' },
  { id: 'news', name: 'Quantic News', sub: 'Flux & veille', icon: Newspaper, tone: 'blue' },
  { id: 'providence', name: 'Providence', sub: 'Analyse & prospective', icon: Compass, tone: 'silver' },
]

function GlidePortal() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('home')

  const launchSearch = () => {
    const value = query.trim()
    if (!value) return
    const target = /^https?:\/\//i.test(value)
      ? value
      : 'https://www.google.com/search?q=' + encodeURIComponent(value)
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="browser" className="section glide-portal-section">
      <div className="glide-portal-heading">
        <SectionTitle
          eyebrow="Portail navigateur"
          title={<>Quantic Glide devient la <span className="blue">porte d’entrée de Sillage.</span></>}
          text="Un point de départ unique pour naviguer, rechercher et rejoindre les services Quantic sans perdre la logique de confidentialité du navigateur."
        />
        <div className="glide-portal-actions">
          <a className="button primary" href="https://github.com/XDSawyerLoL/Quantic-Browser" target="_blank" rel="noreferrer">
            Ouvrir le projet <Github size={16} />
          </a>
          <a className="button ghost" href="#projects">Voir l’écosystème</a>
        </div>
      </div>

      <motion.div
        className="glide-browser"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: .2 }}
        transition={{ duration: .65 }}
      >
        <div className="glide-browser-top">
          <div className="glide-window-controls"><i /><i /><i /></div>
          <div className="glide-tabs">
            <button className={active === 'home' ? 'active' : ''} onClick={() => setActive('home')}>
              <Globe2 size={13} /> Accueil Sillage
            </button>
            <button className={active === 'privacy' ? 'active' : ''} onClick={() => setActive('privacy')}>
              <ShieldCheck size={13} /> Confidentialité
            </button>
          </div>
          <div className="glide-engine"><span className="glide-engine-dot" /> Gecko · Ladybird · Servo</div>
        </div>

        <div className="glide-toolbar">
          <button className="glide-tool" aria-label="Accueil" onClick={() => setActive('home')}><Orbit size={17} /></button>
          <div className="glide-address">
            <LockKeyhole size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && launchSearch()}
              placeholder="Rechercher sur le web ou saisir une adresse"
              aria-label="Recherche Glide"
            />
            <button onClick={launchSearch} aria-label="Rechercher"><Search size={17} /></button>
          </div>
          <div className="glide-privacy-pill"><ShieldCheck size={14} /> Protection active</div>
        </div>

        <div className="glide-viewport">
          <div className="glide-ambient one" />
          <div className="glide-ambient two" />

          {active === 'home' ? (
            <div className="glide-home">
              <div className="glide-home-copy">
                <div className="glide-mini-brand"><span className="glide-orb" /> QUANTIC GLIDE</div>
                <h3>Le web, sans perdre le contrôle.</h3>
                <p>Glide rassemble la navigation privée et l’écosystème Quantic dans un portail sobre, rapide et portable.</p>
              </div>

              <div className="glide-shortcuts" aria-label="Services Quantic">
                {glideShortcuts.map(({ id, name, sub, icon: Icon, tone }) => (
                  <button key={id} className="glide-shortcut" onClick={() => setActive(id)}>
                    <span className={'shortcut-icon ' + tone}><Icon size={20} /></span>
                    <strong>{name}</strong>
                    <small>{sub}</small>
                  </button>
                ))}
              </div>

              <div className="glide-live-strip">
                <div><Wifi size={14} /><span>DNS sécurisé</span><strong>Actif</strong></div>
                <div><ShieldCheck size={14} /><span>Traqueurs</span><strong>Bloqués</strong></div>
                <div><Fingerprint size={14} /><span>Fingerprint</span><strong>Limité</strong></div>
                <div><Zap size={14} /><span>Mode portable</span><strong>Prêt</strong></div>
              </div>
            </div>
          ) : active === 'privacy' ? (
            <div className="glide-detail-screen">
              <div className="glide-detail-icon"><ShieldCheck size={34} /></div>
              <div>
                <span className="eyebrow">Protection par défaut</span>
                <h3>La confidentialité n’est pas un mode à activer.</h3>
                <p>Cookies tiers bloqués, géolocalisation refusée par défaut, fuite WebRTC limitée, suppression des données à la fermeture et DNS sécurisé.</p>
              </div>
            </div>
          ) : (
            <div className="glide-detail-screen">
              <div className="glide-detail-icon"><ExternalLink size={34} /></div>
              <div>
                <span className="eyebrow">Portail Quantic</span>
                <h3>{glideShortcuts.find(item => item.id === active)?.name}</h3>
                <p>{glideShortcuts.find(item => item.id === active)?.sub} — accessible depuis Glide comme une brique native de l’écosystème Quantic Sillage.</p>
                <button className="button primary" onClick={() => setActive('home')}>Retour au portail</button>
              </div>
            </div>
          )}
        </div>

        <div className="glide-statusbar">
          <span><Gauge size={13} /> Navigation privée</span>
          <span><ShieldCheck size={13} /> Zéro Chromium</span>
          <span className="glide-status-spacer" />
          <span>Quantic Sillage · Glide Portal</span>
        </div>
      </motion.div>
    </section>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Quantic Minds">
          <Logo />
        </a>
        <nav className="desktop-nav">
          <a href="#lab">Le Lab</a>
          <a href="#projects">Projets</a>
          <a href="#browser">Glide</a>
          <a href="#research">Recherche</a>
          <a href="#team">Équipe</a>
          <a href="#press">Presse</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-cta" href="#projects">Découvrir nos projets <ArrowRight size={15} /></a>
        <button className="menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          {['lab','projects','browser','research','team','press','contact'].map(id => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{id === 'browser' ? 'Glide' : id === 'research' ? 'Recherche' : id === 'team' ? 'Équipe' : id === 'press' ? 'Presse' : id === 'projects' ? 'Projets' : id === 'contact' ? 'Contact' : 'Le Lab'}</a>
          ))}
        </div>
      )}

      <main id="top">
        <section className="hero">
          <div className="hero-media" />
          <div className="hero-overlay" />
          <motion.div className="hero-content" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
            <div className="hero-kicker">PEOPLE · IDEAS · TECHNOLOGY · A BRIGHTER TOMORROW</div>
            <h1>Des idées d’aujourd’hui<br />pour un <span>demain plus ouvert.</span></h1>
            <p>Quantic Minds conçoit des produits numériques, des systèmes intelligents et des expériences qui rapprochent la technologie de l’usage réel.</p>
            <div className="hero-actions">
              <a className="button primary" href="#projects">Découvrir nos projets <ArrowRight size={17} /></a>
              <a className="button ghost" href="#lab">Explorer le Lab</a>
            </div>
            <div className="hero-metrics">
              <div><strong>6+</strong><span>projets explorés</span></div>
              <div><strong>1</strong><span>vision produit</span></div>
              <div><strong>∞</strong><span>possibilités à tester</span></div>
            </div>
          </motion.div>
          <div className="hero-note">EXPLORER<br />COMPRENDRE<br />CONSTRUIRE<br /><span>ENSEMBLE</span></div>
        </section>

        <section id="projects" className="section projects-section">
          <SectionTitle eyebrow="Notre écosystème" title={<>Des projets complémentaires pour <span className="blue">un impact réel.</span></>} text="Des produits distincts, reliés par la même question : comment rendre la technologie plus utile, plus claire et plus humaine ?" />
          <div className="project-grid">
            {projects.map((project, index) => {
              const Icon = project.icon
              return (
                <motion.article className="project-card" key={project.name} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .05 }}>
                  <div className="project-icon"><Icon size={24} /></div>
                  <div className="project-status">{project.status}</div>
                  <div className="project-kicker">{project.kicker}</div>
                  <h3>{project.name}</h3>
                  <p>{project.copy}</p>
                  {project.portal
                    ? <a className="project-explore-link" href="#browser">Ouvrir le portail <ArrowRight size={16} /></a>
                    : <button>Explorer <ArrowRight size={16} /></button>}
                </motion.article>
              )
            })}
            <article className="project-card future-card">
              <Sparkles size={25} />
              <div className="project-kicker">À venir</div>
              <h3>Une suite de logiciels.</h3>
              <p>Même vision. Plus d’outils. Plus de possibilités. Les prochaines briques de l’écosystème Quantic Minds sont déjà en exploration.</p>
            </article>
          </div>
        </section>

        <GlidePortal />

        <section id="lab" className="section lab-section">
          <div className="lab-image" />
          <div className="lab-copy">
            <SectionTitle eyebrow="Le Lab" title={<>Construire, tester, apprendre, <span className="gold">recommencer.</span></>} />
            <p>Quantic Minds est un laboratoire produit indépendant. Nous explorons l’IA appliquée, les nouveaux usages, la confidentialité, la prospective et l’expérience utilisateur en partant d’un principe simple : la technologie doit réduire la friction au lieu d’en créer une nouvelle.</p>
            <div className="pill-grid">
              <span><BrainCircuit size={17} /> Intelligence appliquée</span>
              <span><Layers3 size={17} /> Produits numériques</span>
              <span><Fingerprint size={17} /> Expérience & adoption</span>
              <span><DatabaseZap size={17} /> Prospective & décision</span>
            </div>
          </div>
        </section>

        <section id="research" className="section research-section">
          <SectionTitle eyebrow="Recherche" title={<>Nous ne cherchons pas à empiler des fonctionnalités.<br /><span className="blue">Nous cherchons à déplacer le point de friction.</span></>} />
          <div className="research-list">
            {research.map(([name, copy], i) => (
              <motion.div className="research-row" key={name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * .06 }}>
                <span className="research-index">0{i+1}</span>
                <h3>{name}</h3>
                <p>{copy}</p>
                <ArrowRight size={18} />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="section method-section">
          <SectionTitle eyebrow="Méthode" title="Observer. Prototyper. Tester. Industrialiser." text="Une démarche courte, concrète et itérative : apprendre suffisamment vite pour éviter de construire longtemps la mauvaise chose." />
          <div className="method-grid">
            {['Observer les usages réels','Prototyper sans surconstruire','Tester la friction et l’adoption','Industrialiser ce qui mérite de durer'].map((item,i) => (
              <div className="method-card" key={item}><span>0{i+1}</span><h3>{item}</h3></div>
            ))}
          </div>
          <div className="refuse-box">
            <div className="eyebrow">Ce que nous refusons</div>
            <div className="refuse-tags"><span>Complexité gratuite</span><span>Automatisation opaque</span><span>Interfaces qui servent la machine</span><span>Métriques vanity</span></div>
          </div>
        </section>

        <section id="team" className="section team-section">
          <SectionTitle eyebrow="Meet the Minds" title={<>Cinq regards. Une obsession : <span className="blue">rendre la technologie plus humaine.</span></>} text="Une équipe de marque conçue autour de cinq disciplines complémentaires : recherche, système, produit, expérience et infrastructure." />
          <div className="team-grid">
            {minds.map((person, i) => (
              <motion.article className="person-card" key={person.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .06 }}>
                <div className={`person-portrait ${person.hue}`}><span>{person.initials}</span><div className="portrait-shine" /></div>
                <h3>{person.name}</h3>
                <div className="person-role">{person.role}</div>
                <blockquote>« {person.quote} »</blockquote>
              </motion.article>
            ))}
          </div>
          <div className="founder-note">
            <div><span className="eyebrow">Direction</span><h3>Valentin Hernandez</h3><p>Founder & Product Lead — innovation, transformation digitale, IA appliquée, UX et conception de produits numériques.</p></div>
            <div className="founder-badge"><Logo compact /><span>Founder<br />Quantic Minds</span></div>
          </div>
        </section>

        <section className="vision-section">
          <div className="vision-bg" />
          <div className="vision-content">
            <div className="eyebrow">Vision</div>
            <h2>Nous construisons pour<br /><span>ce qui vient après.</span></h2>
            <p>Des produits capables de comprendre davantage le contexte, d’agir avec des limites claires, de respecter les choix de l’utilisateur et de rendre la technologie moins intrusive.</p>
          </div>
        </section>

        <section id="press" className="section press-section">
          <div>
            <SectionTitle eyebrow="Presse & médias" title="Une identité prête à être racontée." text="Logo, univers visuel, fonds d’écran, éléments de langage et ressources de marque : tout ce qu’il faut pour présenter Quantic Minds avec cohérence." />
            <div className="press-actions"><button className="button primary">Télécharger le press kit</button><a className="button ghost" href="#contact">Demande média</a></div>
          </div>
          <div className="press-quote">« Les gens ne cesseront jamais de rêver.<br /><strong>La technologie est là pour donner forme à leurs rêves.</strong> »</div>
        </section>

        <section id="contact" className="section contact-section">
          <div className="contact-copy">
            <div className="eyebrow">Contact</div>
            <h2>Parler avec<br /><span className="blue">Quantic Minds.</span></h2>
            <p>Partenariat, presse, produit, recrutement ou simple échange autour d’une idée : choisissez le bon sujet et écrivez-nous.</p>
          </div>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-row"><input placeholder="Nom" /><input type="email" placeholder="Email" /></div>
            <input placeholder="Entreprise" />
            <select defaultValue=""><option value="" disabled>Sujet</option><option>Partenariat</option><option>Presse</option><option>Produit</option><option>Recrutement</option><option>Autre</option></select>
            <textarea rows="5" placeholder="Votre message" />
            <button className="button primary" type="submit">Envoyer <ArrowRight size={17} /></button>
          </form>
        </section>
      </main>

      <footer className="footer">
        <Logo />
        <div className="footer-copy">Innovation · IA · Produits numériques</div>
        <div className="footer-links"><a href="#projects">Projets</a><a href="#press">Presse</a><a href="#contact">Contact</a><a href="#">Confidentialité</a><a href="#">Mentions légales</a></div>
        <div className="footer-bottom"><span>© 2026 Quantic Minds.</span><span>Laboratoire indépendant de produits numériques.</span></div>
      </footer>
    </div>
  )
}
