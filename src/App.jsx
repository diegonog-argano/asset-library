import { useState } from 'react';
import Header from './components/Header/Header.jsx';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import IconsSection from './components/sections/IconsSection.jsx';
import ColorsSection from './components/sections/ColorsSection.jsx';
import LogosSection from './components/sections/LogosSection.jsx';
import ComingSoonSection from './components/sections/ComingSoonSection.jsx';
import { CartProvider } from './cart/CartContext.jsx';
import FloatingCart from './cart/FloatingCart.jsx';

const COMING_SOON = {
  templates: {
    title: 'Templates',
    description:
      'Branded templates for presentations, documents, and email — pre-formatted and on-brand.',
  },
  photography: {
    title: 'Photography',
    description:
      'Approved imagery for marketing, social, and web. Search by theme and download in the right format.',
  },
  graphics: {
    title: 'Graphics',
    description:
      'Decorative brand assets like Pathways, ribbons, and shapes you can drop into compositions.',
  },
};

export default function App() {
  const [section, setSection] = useState('icons');
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const renderSection = () => {
    switch (section) {
      case 'icons':
        return <IconsSection onToast={showToast} />;
      case 'colors':
        return <ColorsSection onToast={showToast} />;
      case 'logo':
        return <LogosSection onToast={showToast} />;
      default: {
        const meta = COMING_SOON[section];
        if (!meta) return null;
        return (
          <ComingSoonSection
            title={meta.title}
            description={meta.description}
          />
        );
      }
    }
  };

  return (
    <CartProvider>
      <div className="app">
        <Header onToast={showToast} />
        <div className="app-body">
          <Sidebar active={section} onSelect={setSection} />
          <main className="app-main">{renderSection()}</main>
        </div>
        <FloatingCart onToast={showToast} />
        {toast && <div className="toast">{toast}</div>}
      </div>
    </CartProvider>
  );
}
