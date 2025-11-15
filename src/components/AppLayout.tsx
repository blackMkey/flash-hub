"use client";

import { type ReactNode, useEffect } from "react";
import { Box, Container } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
}

// Path to title mapping
const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case "/":
      return "Flash Home";
    case "/epics":
      return "Epic Tasks Dashboard";
    case "/epics/addSubTask":
      return "Add Sub-Task to Epic";
    default:
      return "Flash Hub";
  }
};

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const isHomePage = pathname === "/";

  // Auth store
  const { checkExistingAuth } = useAuthStore();

  useEffect(() => {
    // Check existing authentication on page load
    console.log("Checking existing authentication...");
    checkExistingAuth();
  }, [checkExistingAuth]);

  return (
    <Box
      minH="100vh"
      bgGradient="linear(135deg, #2d5016 0%, #3d6b1f 25%, #4a7c23 50%)"
    >
      <Container maxW="7xl" py={8}>
        {/* Header */}
        {!isHomePage && <AppHeader pageTitle={pageTitle} />}

        {/* Page Content */}
        {children}
      </Container>
    </Box>
  );
}
