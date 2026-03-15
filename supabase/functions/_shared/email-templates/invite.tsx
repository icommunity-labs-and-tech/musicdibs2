/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te han invitado a MusicDibs</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={logoSection}>
          <Text style={logoText}>MUSICDIBS</Text>
          <Text style={tagline}>by iCommunity · Registro de Propiedad Intelectual</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>🎶 Te han invitado</Heading>
          <Text style={text}>
            Has sido invitado a unirte a <Link href={siteUrl} style={link}><strong>MusicDibs</strong></Link>. Haz clic en el botón para aceptar la invitación.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Aceptar invitación →
          </Button>
          <Text style={footer}>Si no esperabas esta invitación, puedes ignorar este email.</Text>
        </Section>
        <Text style={bottom}>musicdibs.com · Soporte</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#0d0618', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }
const wrapper = { padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { color: '#a855f7', fontSize: '22px', fontWeight: '800' as const, letterSpacing: '1px', margin: '0' }
const tagline = { color: '#9ca3af', fontSize: '11px', margin: '4px 0 0' }
const card = { backgroundColor: '#1a0a2e', borderRadius: '16px', padding: '40px 36px', textAlign: 'center' as const }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#f3f4f6', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#d1d5db', lineHeight: '1.7', margin: '0 0 20px' }
const link = { color: '#a855f7', textDecoration: 'none' }
const button = { backgroundColor: '#a855f7', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 40px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '24px 0 0' }
const bottom = { fontSize: '11px', color: '#6b7280', textAlign: 'center' as const, marginTop: '28px', lineHeight: '1.6' }
