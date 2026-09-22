import { RouterProvider } from "react-router-dom";
import router from "./router";

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
