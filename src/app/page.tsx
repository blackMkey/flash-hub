'use client'

import {
  Box,
  Button,
  Flex,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.1"
        bgImage="radial-gradient(circle at 25% 25%, #90ee90 3px, transparent 3px)"
        bgSize="40px 40px"
      />
      
      <Flex 
        direction={{ base: "column", lg: "row" }} 
        align="center" 
        justify="space-between"
        minH="70vh"
        gap={12}
        position="relative"
      >
        {/* Left Content */}
        <Stack gap={8} flex="1" maxW="600px">
          <Box 
            bg="rgba(255,255,255,0.85)" 
            backdropFilter="blur(10px)"
            p={6}
            borderRadius="2xl"
            border="2px solid rgba(144,238,144,0.3)"
            shadow="lg"
          >
            <Text 
              fontSize={{ base: "xl", md: "2xl" }}
              color="gray.700"
              fontWeight="medium"
              textAlign="center"
              letterSpacing="wider"
            >
              &ldquo;Niceeeee tooooo meeet youuuu...&rdquo;
            </Text>
            <Text 
              fontSize={{ base: "lg", md: "xl" }}
              color="gray.600"
              mt={4}
              textAlign="center"
            >
              Hi! I&apos;m Flash, your friendly Jira assistant. 
              <br />
              What would you like help with today?  🦥
            </Text>
          </Box>

          <Stack gap={4} align="center">
            <Link href="/epics" passHref>
              <Button
                size="xl"
                bg="linear-gradient(45deg, #90ee90, #32cd32)"
                color="white"
                fontSize="xl"
                fontWeight="bold"
                px={12}
                py={8}
                borderRadius="full"
                shadow="2xl"
                _hover={{
                  transform: "translateY(-2px)",
                  shadow: "3xl",
                  bg: "linear-gradient(45deg, #98fb98, #3cb371)"
                }}
                transition="all 0.3s ease"
              >
                Browse Epic Tasks
              </Button>
            </Link>
            
            <Text 
              fontSize="sm" 
              color="gray.500"
              textAlign="center"
            >
              Ready when you are... no rush! 🚀
            </Text>
          </Stack>
        </Stack>

        {/* Right - Flash Image */}
        <Box flex="1" display="flex" justifyContent="center" alignItems="center">
          <Box
            position="relative"
            maxW="500px"
            w="100%"
          >
            <Box
              position="absolute"
              top="-20px"
              left="-20px"
              right="-20px"
              bottom="-20px"
              bg="linear-gradient(45deg, rgba(144,238,144,0.3), rgba(50,205,50,0.3))"
              borderRadius="full"
              filter="blur(20px)"
            />
            <Image
              src="/flash.jpg"
              alt="Flash the Sloth - Your Jira Assistant"
              borderRadius="2xl"
              shadow="2xl"
              w="100%"
              h="auto"
              position="relative"
              border="4px solid rgba(144,238,144,0.4)"
            />
          </Box>
        </Box>
      </Flex>
    </>
  )
}
