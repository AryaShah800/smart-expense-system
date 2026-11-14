import { Navigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAppDispatch, useAppSelector, selectUser } from "../store/hooks";
import { verifySession } from "../store/authSlice";

/**
 * Lets a signed-in user in straight away, then checks the session in the background.
 * `verifySession` signs out only on a 401, so Render cold starts and network errors
 * never log the user out.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const signedIn = user !== null;

  useEffect(() => {
    if (signedIn) dispatch(verifySession());
  }, [signedIn, dispatch]);

  if (!signedIn) return <Navigate to="/login" replace />;
  return children;
}

export default ProtectedRoute;
