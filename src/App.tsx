import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Routing } from "./routes/Routing";
import "./styles/global.css";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routing />
    </BrowserRouter>
  );
};

export default App;
