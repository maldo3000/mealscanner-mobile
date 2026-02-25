import { Image } from 'expo-image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Animated,
    Modal,
    PanResponder,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HOW_IT_WORKS_CARDS, HowItWorksCardContent } from '@/constants/howItWorksTutorial'
import { Spacing } from '@/constants/Spacing'
import { TextStyles } from '@/constants/Typography'
import { useTheme } from '@/context/ThemeContext'

import { Button } from './Button'
import { IconSymbol } from './IconSymbol'

interface HowItWorksTutorialModalProps {
  visible: boolean
  onClose: () => void
  onTakePhoto?: () => void
  onSeen?: () => void | Promise<void>
}

interface TutorialFinalPage {
  id: 'final'
  visual: 'final'
}

type TutorialPage = HowItWorksCardContent | TutorialFinalPage

const SWIPE_THRESHOLD = 50

export function HowItWorksTutorialModal({
  visible,
  onClose,
  onTakePhoto,
  onSeen,
}: HowItWorksTutorialModalProps) {
  const insets = useSafeAreaInsets()
  const { tokens, accentAlpha } = useTheme()

  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedMethodId, setSelectedMethodId] = useState('photo')
  const [showMultipleItems, setShowMultipleItems] = useState(false)
  const [selectedContextExample, setSelectedContextExample] = useState('1 tbsp olive oil')
  const [detailFlags, setDetailFlags] = useState({
    ingredients: true,
    portion: true,
    cookingMethod: false,
  })
  const [precisionMode, setPrecisionMode] = useState(true)
  const [recipeLogged, setRecipeLogged] = useState(false)

  const pages = useMemo<TutorialPage[]>(
    () => [...HOW_IT_WORKS_CARDS, { id: 'final', visual: 'final' }],
    []
  )

  const isFinalPage = activeIndex === pages.length - 1

  // Reset state when modal opens
  useEffect(() => {
    if (!visible) return
    setActiveIndex(0)
    setSelectedMethodId('photo')
    setShowMultipleItems(false)
    setSelectedContextExample('1 tbsp olive oil')
    setDetailFlags({ ingredients: true, portion: true, cookingMethod: false })
    setPrecisionMode(true)
    setRecipeLogged(false)
  }, [visible])

  // Swipe gesture via PanResponder
  const panX = useRef(new Animated.Value(0)).current
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          panX.setValue(gestureState.dx)
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -SWIPE_THRESHOLD && activeIndex < pages.length - 1) {
            setActiveIndex((prev) => prev + 1)
          } else if (gestureState.dx > SWIPE_THRESHOLD && activeIndex > 0) {
            setActiveIndex((prev) => prev - 1)
          }
          Animated.spring(panX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 20 }).start()
        },
        onPanResponderTerminate: () => {
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [activeIndex, pages.length, panX]
  )

  const handleDismiss = useCallback(async () => {
    if (onSeen) {
      await onSeen()
    }
    onClose()
  }, [onClose, onSeen])

  const handleTakePhoto = useCallback(async () => {
    if (onSeen) {
      await onSeen()
    }
    onClose()
    onTakePhoto?.()
  }, [onClose, onSeen, onTakePhoto])

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, pages.length - 1))
  }, [pages.length])

  const handleBack = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  // --- Visual renderers ---

  const renderVisual = (card: HowItWorksCardContent): React.ReactNode => {
    const visualGlow = (
      <View
        style={[
          styles.glow,
          {
            backgroundColor: tokens.accent,
            opacity: 0.15,
          },
        ]}
      />
    )

    if (card.visual === 'welcome') {
      return (
        <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          {visualGlow}
          <View style={styles.rowBetween}>
            <View style={[styles.pill, styles.elevatedElement, { backgroundColor: accentAlpha(0.15), borderColor: tokens.border, borderWidth: 1 }]}>
              <IconSymbol name="camera.fill" size={14} color={tokens.accent} />
              <Text style={[TextStyles.caption, { color: tokens.accent }]}>Capture</Text>
            </View>
            <View style={[styles.pill, styles.elevatedElement, { backgroundColor: accentAlpha(0.15), borderColor: tokens.border, borderWidth: 1 }]}>
              <IconSymbol name="chart.bar.fill" size={14} color={tokens.accent} />
              <Text style={[TextStyles.caption, { color: tokens.accent }]}>Macros</Text>
            </View>
          </View>
          <View style={[styles.mockNutritionCard, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt }]}>
            <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>Grilled chicken bowl</Text>
            <Text style={[TextStyles.h2, { color: tokens.textPrimary, marginVertical: 4 }]}>540 kcal</Text>
            <Text style={[TextStyles.caption, { color: tokens.textMuted }]}>P 43g  C 39g  F 24g</Text>
          </View>
        </View>
      )
    }

    if (card.visual === 'fourWays') {
      const methods = [
        { id: 'photo', label: 'Photo', icon: 'camera.fill' as const },
        { id: 'voice', label: 'Voice', icon: 'mic' as const },
        { id: 'database', label: 'Database', icon: 'magnifyingglass' as const },
        { id: 'recipes', label: 'Recipes', icon: 'book.closed' as const },
      ]
      return (
        <View style={styles.grid}>
          {methods.map((method) => {
            const selected = selectedMethodId === method.id
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  styles.elevatedElement,
                  {
                    borderColor: selected ? tokens.accent : tokens.border,
                    backgroundColor: selected ? accentAlpha(0.2) : tokens.glassSurface,
                  },
                ]}
                onPress={() => setSelectedMethodId(method.id)}
                activeOpacity={0.8}
              >
                <IconSymbol name={method.icon} size={24} color={selected ? tokens.accent : tokens.textPrimary} />
                <Text style={[TextStyles.bodySmall, { color: selected ? tokens.accent : tokens.textPrimary }]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )
    }

    if (card.visual === 'photo') {
      return (
        <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          {visualGlow}
          <View style={[styles.cameraFrame, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt, overflow: 'hidden' }]}>
            {/* Salad Image */}
            <Image
              source={require('@/assets/images/r002-keto-avocado-salad.png')}
              style={[styles.plateMock, { borderColor: tokens.border, backgroundColor: tokens.background }]}
              contentFit="cover"
            />
            {/* Viewfinder crosshairs overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.crosshairCenter}>
                <View style={[styles.crosshairLine, { width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.7)' }]} />
                <View style={[styles.crosshairLine, { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.7)' }]} />
              </View>
              {/* Corner brackets */}
              <View style={[styles.cornerBracket, { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 }]} />
              <View style={[styles.cornerBracket, { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 }]} />
              <View style={[styles.cornerBracket, { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
              <View style={[styles.cornerBracket, { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 }]} />
            </View>

            {showMultipleItems && (
              <View style={[styles.sideItemWrapper, styles.elevatedElement]}>
                <Image
                  source={require('@/assets/images/r015-chocolate-protein-shake.png')}
                  style={[styles.sidePlateMock, { borderColor: tokens.border, backgroundColor: tokens.background }]}
                  contentFit="cover"
                />
              </View>
            )}
          </View>
          <Button
            variant="glass"
            size="small"
            onPress={() => setShowMultipleItems((v) => !v)}
            icon={<IconSymbol name="plus" size={14} color={tokens.textPrimary} />}
            style={styles.elevatedElement}
          >
            {showMultipleItems ? 'One photo only' : 'Add another item'}
          </Button>
        </View>
      )
    }

    if (card.visual === 'context') {
      return (
        <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          {visualGlow}
          {/* Mocking DescribeInputSheet visual structure */}
          <View style={[styles.noteInput, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt, minHeight: 120, alignItems: 'flex-start', paddingTop: Spacing.md }]}>
            <Text style={[TextStyles.h3, { color: tokens.textPrimary, flex: 1, fontSize: 20, lineHeight: 28 }]}>
              {selectedContextExample}
            </Text>
            {/* Context action bar */}
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', paddingTop: Spacing.sm }}>
               <View style={{ 
                 width: 48, height: 48, borderRadius: 24, 
                 backgroundColor: accentAlpha(0.15), 
                 alignItems: 'center', justifyContent: 'center',
                 borderWidth: 1, borderColor: tokens.accent 
               }}>
                 <IconSymbol name="mic" size={24} color={tokens.accent} />
               </View>
            </View>
          </View>
          <View style={styles.examplesWrap}>
            {(card.examples ?? []).map((example) => {
              const selected = selectedContextExample === example
              return (
                <TouchableOpacity
                  key={example}
                  onPress={() => setSelectedContextExample(example)}
                  activeOpacity={0.8}
                  style={[
                    styles.exampleChip,
                    styles.elevatedElement,
                    {
                      borderColor: selected ? tokens.accent : tokens.border,
                      backgroundColor: selected ? accentAlpha(0.2) : tokens.glassSurface,
                    },
                  ]}
                >
                  <Text style={[TextStyles.caption, { color: selected ? tokens.accent : tokens.textMuted }]}>
                    {example}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    if (card.visual === 'describe') {
      return (
        <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          {visualGlow}
          
          <View style={[styles.mockQuote, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt, minHeight: 140, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[TextStyles.h3, { color: tokens.textPrimary, flex: 1, fontSize: 22, lineHeight: 30 }]}>
              2 eggs scrambled in butter, 2 slices toast, 1 tbsp jam
            </Text>
            {/* Mimic bottom controls of Describe screen */}
            <View style={{ width: '100%', alignItems: 'center', marginTop: Spacing.md }}>
               <View style={{ 
                 width: 64, height: 64, borderRadius: 32, 
                 backgroundColor: 'transparent', 
                 alignItems: 'center', justifyContent: 'center',
                 borderWidth: 2, borderColor: tokens.accent 
               }}>
                 <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: tokens.accent }} />
               </View>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <ToggleChip
              label="Ingredients"
              active={detailFlags.ingredients}
              onPress={() => setDetailFlags((v) => ({ ...v, ingredients: !v.ingredients }))}
            />
            <ToggleChip
              label="Portion"
              active={detailFlags.portion}
              onPress={() => setDetailFlags((v) => ({ ...v, portion: !v.portion }))}
            />
            <ToggleChip
              label="Cooked"
              active={detailFlags.cookingMethod}
              onPress={() => setDetailFlags((v) => ({ ...v, cookingMethod: !v.cookingMethod }))}
            />
          </View>
        </View>
      )
    }

    if (card.visual === 'database') {
      return (
        <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          {visualGlow}
          <View style={[styles.searchBar, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt }]}>
            <IconSymbol name="magnifyingglass" size={18} color={tokens.textMuted} />
            <Text style={[TextStyles.body, { color: tokens.textMuted, marginLeft: 8 }]}>Search food database...</Text>
          </View>
          <View style={[styles.databaseItem, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt }]}>
            <View>
              <Text style={[TextStyles.body, { color: tokens.textPrimary, fontWeight: '600' }]}>Greek yogurt, plain</Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: 2 }]}>170 g • USDA</Text>
            </View>
            <TouchableOpacity
              onPress={() => setPrecisionMode((v) => !v)}
              activeOpacity={0.8}
              style={[styles.switchPill, { backgroundColor: precisionMode ? tokens.accent : tokens.glassSurface, borderWidth: precisionMode ? 0 : 1, borderColor: tokens.border }]}
            >
              <Text style={[TextStyles.caption, { color: precisionMode ? tokens.textOnAccent : tokens.textMuted, fontWeight: '600' }]}>
                {precisionMode ? 'Exact' : 'Quick'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    if (card.visual === 'accuracy') {
      return (
        <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
          {visualGlow}
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: Spacing.md }}>
            <View style={[styles.elevatedElement, { width: 80, height: 80, borderRadius: 40, backgroundColor: accentAlpha(0.15), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.accent }]}>
              <IconSymbol name="sparkles" size={40} color={tokens.accent} />
            </View>
            <View style={[styles.mockQuote, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt, width: '100%', flexDirection: 'column', alignItems: 'center', padding: Spacing.lg }]}>
              <Text style={[TextStyles.h3, { color: tokens.textPrimary, textAlign: 'center' }]}>~ 650 kcal</Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, textAlign: 'center', marginTop: 4 }]}>AI Estimate</Text>
            </View>
          </View>
        </View>
      )
    }

    // recipes (default)
    return (
      <View style={[styles.visualCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.border }]}>
        {visualGlow}
        <View style={[styles.recipeCard, styles.elevatedElement, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
             <View style={{ width: '60%' }}>
                <Text style={[TextStyles.h3, { color: tokens.textPrimary }]}>High-Protein Bowl</Text>
                <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: 4 }]}>520 kcal • 42g protein</Text>
             </View>
             <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: tokens.glassSurface, borderWidth: 1, borderColor: tokens.border }} />
          </View>
          <Button
            variant={recipeLogged ? 'secondary' : 'primary'}
            size="small"
            onPress={() => setRecipeLogged((v) => !v)}
            style={{ marginTop: Spacing.sm }}
          >
            {recipeLogged ? 'Logged' : 'Log meal'}
          </Button>
        </View>
      </View>
    )
  }

  // --- Page content ---

  const currentPage = pages[activeIndex]

  const renderCurrentPage = () => {
    if (!currentPage) return null

    if (currentPage.visual === 'final') {
      return (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.contentBlock}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[TextStyles.h2, { color: tokens.textPrimary }]}>Ready to log your first meal?</Text>
          <Text style={[TextStyles.body, { color: tokens.textMuted }]}>
            You can start with a photo and refine details whenever needed.
          </Text>
          <View style={{ marginTop: Spacing.lg, width: '100%', gap: Spacing.sm }}>
            <Button
              fullWidth
              variant="primary"
              onPress={() => { void handleTakePhoto() }}
              icon={<IconSymbol name="camera.fill" size={16} color={tokens.textOnAccent} />}
            >
              Take a photo
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onPress={() => { void handleDismiss() }}
            >
              Skip for now
            </Button>
          </View>
        </ScrollView>
      )
    }

    const card = currentPage as HowItWorksCardContent
    
    // Custom Tip Override for the Photo Card
    const tipText = card.visual === 'photo' 
      ? "Have a drink or side dish? Snap a photo of that too! You can add up to four photos to a single meal entry."
      : card.tipLine;

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.contentBlock}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[TextStyles.h2, { color: tokens.textPrimary, marginBottom: Spacing.md }]}>{card.headline}</Text>
        
        <View style={styles.visualContainer}>
          {renderVisual(card)}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[TextStyles.body, { color: tokens.textMuted }]}>{card.body}</Text>
          {tipText ? (
            <View style={[styles.tipCard, { borderColor: tokens.border, backgroundColor: tokens.backgroundAlt }]}>
              <IconSymbol name="lightbulb" size={16} color={tokens.accent} />
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, flex: 1, lineHeight: 20 }]}>{tipText}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    )
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => void handleDismiss()}>
      <SafeAreaView style={styles.modalRoot}>
        {/* Backdrop */}
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => void handleDismiss()} />
        </View>

        {/* Container */}
        <View style={styles.containerShell} pointerEvents="box-none">
          <View
            style={[
              styles.container,
              {
                backgroundColor: tokens.background,
                borderColor: tokens.border,
                marginTop: insets.top + Spacing.base,
                marginBottom: insets.bottom + Spacing.base,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => void handleDismiss()} style={styles.skipTap} activeOpacity={0.7}>
                <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>Skip</Text>
              </TouchableOpacity>
              <View style={styles.headerCenterSpacer} />
              <TouchableOpacity onPress={() => void handleDismiss()} style={styles.skipTap} activeOpacity={0.7}>
                <IconSymbol name="xmark" size={16} color={tokens.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Swipeable card area */}
            <Animated.View
              style={[styles.cardArea, { transform: [{ translateX: panX }] }]}
              {...panResponder.panHandlers}
            >
              {renderCurrentPage()}
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.dots}>
                {pages.map((page, index) => (
                  <View
                    key={page.id}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: index === activeIndex ? tokens.accent : tokens.borderSubtle,
                        width: index === activeIndex ? 24 : 6,
                        opacity: index === activeIndex ? 1 : 0.5,
                      },
                    ]}
                  />
                ))}
              </View>

              {!isFinalPage ? (
                <View style={styles.navButtons}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleBack}
                    disabled={activeIndex === 0}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={[
                      styles.navArrowButton,
                      {
                        borderColor: tokens.accent,
                        backgroundColor: accentAlpha(0.15),
                        opacity: activeIndex === 0 ? 0.3 : 1,
                      },
                    ]}
                  >
                    <IconSymbol name="chevron.left" size={20} color={tokens.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleNext}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={[
                      styles.navArrowButton,
                      {
                        borderColor: tokens.accent,
                        backgroundColor: accentAlpha(0.15),
                      },
                    ]}
                  >
                    <IconSymbol name="chevron.right" size={20} color={tokens.accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.navButtonsPlaceholder} />
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// --- Toggle chip sub-component ---

interface ToggleChipProps {
  label: string
  active: boolean
  onPress: () => void
}

function ToggleChip({ label, active, onPress }: ToggleChipProps) {
  const { tokens, accentAlpha } = useTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.toggleChip,
        styles.elevatedElement,
        {
          borderColor: active ? tokens.accent : tokens.border,
          backgroundColor: active ? accentAlpha(0.2) : tokens.backgroundAlt,
        },
      ]}
    >
      <Text style={[TextStyles.caption, { color: active ? tokens.accent : tokens.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// --- Styles ---

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  containerShell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  container: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  headerCenterSpacer: {
    flex: 1,
  },
  skipTap: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArea: {
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  contentBlock: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  visualContainer: {
    marginVertical: Spacing.xs,
  },
  visualCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 200,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    right: '20%',
    bottom: '20%',
    borderRadius: 100,
    opacity: 0.15,
  },
  elevatedElement: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    gap: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  mockNutritionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  methodCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraFrame: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    flexDirection: 'row',
  },
  plateMock: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
  },
  sideItemWrapper: {
    position: 'absolute',
    right: 30,
    bottom: 10,
    zIndex: 10,
  },
  sidePlateMock: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  examplesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exampleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  toggleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  mockQuote: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  databaseItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  recipeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navArrowButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonsPlaceholder: {
    minHeight: 56,
  },
  crosshairCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    borderRadius: 1,
  },
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 4,
  },
})
