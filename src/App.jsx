import { AppStateProvider, useAppState } from './state/AppState.jsx';
import { Landing } from './screens/Landing.jsx';
import { Processing } from './screens/Processing.jsx';
import { ErrorScreen } from './screens/Error.jsx';
import { Results } from './screens/Results.jsx';
import { Library } from './screens/Library.jsx';
import { About } from './screens/About.jsx';
import { HowItWorks } from './screens/HowItWorks.jsx';

function Router() {
  const { state, goToLibrary, goToScreen, resetToLanding } = useAppState();

  const nav = {
    onOpenLibrary: goToLibrary,
    onHowItWorks: () => goToScreen('how'),
    onAbout: () => goToScreen('about'),
  };

  switch (state.screen) {
    case 'processing':
      return <Processing mode={state.selectedMode} />;
    case 'results':
      return <Results {...nav} />;
    case 'error':
      return <ErrorScreen />;
    case 'library':
      return <Library onOpenLanding={resetToLanding} {...nav} />;
    case 'about':
      return <About {...nav} onStart={resetToLanding} />;
    case 'how':
      return <HowItWorks {...nav} onStart={resetToLanding} />;
    case 'landing':
    default:
      return <Landing {...nav} />;
  }
}

export default function App() {
  return (
    <AppStateProvider>
      <Router />
    </AppStateProvider>
  );
}
