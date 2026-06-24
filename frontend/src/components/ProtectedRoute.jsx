import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function ProtectedRoute({ children, allowedRole }) {
  const { user } = useContext(AuthContext);

  // யூசர் Login செய்யவில்லை என்றால், Login பேஜுக்கு திருப்பி அனுப்பவும்
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin பேஜுக்கு Student வர முயற்சித்தால், அவரை Menu-க்கு அனுப்பவும்
  if (allowedRole && user.role !== allowedRole) {
    alert("Access Denied: You do not have permission to view this page.");
    return <Navigate to="/menu" replace />;
  }

  // எல்லாம் சரியாக இருந்தால், கேட்ட பேஜை காட்டவும்
  return children;
}

export default ProtectedRoute;