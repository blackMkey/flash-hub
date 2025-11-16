"use client";

import { Button, Flex, Heading } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAzureAuthStore, useJiraAuthStore } from "@/stores";
import TokenManager from "./TokenManager";

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
    error: jiraError,
    user: jiraUser,
    saveToken: saveJiraToken,
    clearAuth: clearJiraAuth,
  } = useJiraAuthStore();

  // Azure Auth store
  const {
    isConnected: azureConnected,
    isLoading: azureLoading,
    error: azureError,
    user: azureUser,
    savePat: saveAzurePat,
    clearAuth: clearAzureAuth,
  } = useAzureAuthStore();

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
            error={jiraError}
            userName={jiraUser?.displayName}
            onSave={saveJiraToken}
            onClear={clearJiraAuth}
          />
        ) : (
          <TokenManager
            type="azure"
            isConnected={azureConnected}
            isLoading={azureLoading}
            error={azureError}
            userName={azureUser?.displayName}
            onSave={saveAzurePat}
            onClear={clearAzureAuth}
          />
        )}
      </Flex>
    </>
  );
}
