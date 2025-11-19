"use client";

import { Button, Flex, Heading } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJiraAuthStore } from "@/stores";
import TokenManager from "./TokenManager";
import { useEffect } from "react";
import { toaster } from "@/components/ui/toaster";

interface AppHeaderProps {
  pageTitle: string;
}

export default function AppHeader({ pageTitle }: AppHeaderProps) {
  const pathname = usePathname();
  const isAzurePage = pathname?.startsWith("/azure-sla");

  // Jira Auth store
  const {
    isConnected: jiraConnected,
    isLoading: jiraLoading,
    user: jiraUser,
    saveToken: saveJiraToken,
    clearAuth: clearJiraAuth,
    checkExistingAuth: checkJiraAuth,
  } = useJiraAuthStore();

  useEffect(() => {
    if (!isAzurePage) {
      checkJiraAuth(toaster.success, toaster.error);
    }
  }, [checkJiraAuth, isAzurePage]);

  return (
    <>
      <Flex justify="space-between" align="center" mb={8}>
        <Link href="/">
          <Button variant="outline" colorPalette="whiteAlpha">
            ← Back to Home
          </Button>
        </Link>
        <Heading textAlign="center">{pageTitle}</Heading>

        {/* Token Management */}
        {!isAzurePage ? (
          <TokenManager
            type="jira"
            isConnected={jiraConnected}
            isLoading={jiraLoading}
            userName={jiraUser?.displayName}
            onSave={saveJiraToken}
            onClear={clearJiraAuth}
          />
        ) : (
          <TokenManager type="azure" />
        )}
      </Flex>
    </>
  );
}
