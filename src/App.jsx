import { AppStateProvider, useAppState } from './state/AppState.jsx';
import { Landing } from './screens/Landing.jsx';
import { Processing } from './screens/Processing.jsx';
import { ErrorScreen } from './screens/Error.jsx';
import { Results } from './screens/Results.jsx';
import { Library } from './screens/Library.jsx';

function Router() {
  const { state, goToLibrary, resetToLanding } = useAppState();

  switch (state.screen) {
    case 'processing':
      return <Processing mode={state.selectedMode} />;
    case 'results':
      return <Results onOpenLibrary={goToLibrary} />;
    case 'error':
      return <ErrorScreen />;
    case 'library':
      return <Library onOpenLanding={resetToLanding} />;
    case 'landing':
    default:
      return <Landing onOpenLibrary={goToLibrary} />;
  }
}

export default function App() {
  return (
    <AppStateProvider>
      <Router />
    </AppStateProvider>
  );
}
