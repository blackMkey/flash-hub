"use client";

import { Button, Flex, Heading } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TokenManager from "./TokenManager";

interface AppHeaderProps {
  pageTitle: string;
}

export default function AppHeader({ pageTitle }: AppHeaderProps) {
  const pathname = usePathname();
  const isAzurePage = pathname?.startsWith("/azure-sla");

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
        <TokenManager type={isAzurePage ? "azure" : "jira"} />
      </Flex>
    </>
  );
}
