"use client";

import {
  Toaster as ChakraUIToaster,
  createToaster,
  Toast,
} from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "top-end",
});

export function Toaster() {
  return (
    <ChakraUIToaster toaster={toaster}>
      {(toast) => (
        <Toast.Root width={{ base: "300px", md: "400px" }} minWidth="300px">
          {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
          {toast.description && (
            <Toast.Description>{toast.description}</Toast.Description>
          )}
          <Toast.CloseTrigger />
        </Toast.Root>
      )}
    </ChakraUIToaster>
  );
}
