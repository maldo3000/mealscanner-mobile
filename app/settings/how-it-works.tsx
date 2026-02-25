import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { ContentContainer } from '@/components/layout/ContentContainer'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { HowItWorksTutorialModal } from '@/components/ui/HowItWorksTutorialModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { Spacing } from '@/constants/Spacing'
import { TextStyles } from '@/constants/Typography'
import { useTheme } from '@/context/ThemeContext'

export default function HowItWorksScreen() {
  const router = useRouter()
  const { tokens } = useTheme()
  const [isTutorialVisible, setIsTutorialVisible] = useState(false)

  useEffect(() => {
    setIsTutorialVisible(true)
  }, [])

  const handleCloseTutorial = () => {
    setIsTutorialVisible(false)
    router.back()
  }

  return (
    <PageContainer edges={['top']}>
      <PageHeader
        title="How it works"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ContentContainer>
        <View style={[styles.messageCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          <Text style={[TextStyles.body, { color: tokens.textMuted }]}>
            You can replay the tutorial anytime from this screen.
          </Text>
        </View>
      </ContentContainer>

      <HowItWorksTutorialModal
        visible={isTutorialVisible}
        onClose={handleCloseTutorial}
        onTakePhoto={() => router.push('/(tabs)/log')}
      />
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  messageCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.base,
    marginTop: Spacing.base,
  },
})
