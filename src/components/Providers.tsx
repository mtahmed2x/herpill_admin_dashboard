"use client";

import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store, persistor } from "../store"; // Import the new persistor object
import { PersistGate } from "redux-persist/integration/react"; // Import PersistGate

// Assuming you have these other providers
import { NotificationListener } from "./Notification/NotificationListener";
import { SocketProvider } from "@/context/SocketContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {/* PersistGate ensures the UI is not rendered until the state is rehydrated */}
      <PersistGate loading={null} persistor={persistor}>
        <SocketProvider>
          <NotificationListener />
          {children}
          <Toaster />
        </SocketProvider>
      </PersistGate>
    </Provider>
  );
}
