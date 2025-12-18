import React from 'react';
import { StyleSheet, View } from 'react-native';
import { borderBlack, textBlack } from '@/constants/Colors';

export type FoodType = 'burger' | 'pizza' | 'sushi' | 'salad' | 'cake' | 'coffee' | 'apple' | 'taco';

interface FoodIllustrationProps {
  type: FoodType;
  size?: number;
}

export function FoodIllustration({ type, size = 64 }: FoodIllustrationProps) {
  const renderFood = () => {
    switch (type) {
      case 'burger':
        return <Burger size={size} />;
      case 'pizza':
        return <Pizza size={size} />;
      case 'sushi':
        return <Sushi size={size} />;
      case 'salad':
        return <Salad size={size} />;
      case 'cake':
        return <Cake size={size} />;
      case 'coffee':
        return <Coffee size={size} />;
      case 'apple':
        return <Apple size={size} />;
      case 'taco':
        return <Taco size={size} />;
      default:
        return <Burger size={size} />;
    }
  };

  return <View style={styles.container}>{renderFood()}</View>;
}

// Burger illustration
function Burger({ size }: { size: number }) {
  const bunHeight = size * 0.25;
  const pattyHeight = size * 0.3;
  const eyeSize = size * 0.08;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Top bun */}
      <View style={[styles.bunTop, { width: size * 0.9, height: bunHeight, borderRadius: size * 0.45, borderWidth: 3, borderColor: borderBlack }]} />
      
      {/* Eyes */}
      <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, left: size * 0.3, top: size * 0.35 }]} />
      <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, right: size * 0.3, top: size * 0.35 }]} />
      
      {/* Smile */}
      <View style={[styles.smile, { width: size * 0.3, height: size * 0.15, borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.15, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: size * 0.5, left: size * 0.35 }]} />
      
      {/* Patty */}
      <View style={[styles.patty, { width: size * 0.85, height: pattyHeight, borderRadius: size * 0.15, backgroundColor: '#8B4513', borderWidth: 3, borderColor: borderBlack, top: size * 0.25 }]} />
      
      {/* Bottom bun */}
      <View style={[styles.bunBottom, { width: size * 0.9, height: bunHeight, borderRadius: size * 0.15, backgroundColor: '#FFD700', borderWidth: 3, borderColor: borderBlack, top: size * 0.55 }]} />
    </View>
  );
}

// Pizza illustration
function Pizza({ size }: { size: number }) {
  const eyeSize = size * 0.1;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Pizza base */}
      <View style={[styles.pizzaBase, { width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45, backgroundColor: '#FFD700', borderWidth: 4, borderColor: borderBlack }]}>
        {/* Eyes */}
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, left: size * 0.3, top: size * 0.3 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, right: size * 0.3, top: size * 0.3 }]} />
        
        {/* Smile */}
        <View style={[styles.smile, { width: size * 0.4, height: size * 0.2, borderBottomLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: size * 0.5, left: size * 0.25 }]} />
        
        {/* Pepperoni */}
        <View style={[styles.pepperoni, { width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075, backgroundColor: '#DC143C', borderWidth: 2, borderColor: borderBlack, left: size * 0.2, top: size * 0.45 }]} />
        <View style={[styles.pepperoni, { width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075, backgroundColor: '#DC143C', borderWidth: 2, borderColor: borderBlack, right: size * 0.2, top: size * 0.45 }]} />
      </View>
    </View>
  );
}

// Sushi illustration
function Sushi({ size }: { size: number }) {
  const pieceSize = size * 0.3;
  const eyeSize = size * 0.06;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
      {/* Sushi piece 1 */}
      <View style={[styles.sushiPiece, { width: pieceSize, height: pieceSize * 1.2, borderRadius: pieceSize * 0.2, backgroundColor: '#FFE4B5', borderWidth: 3, borderColor: borderBlack }]}>
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: pieceSize * 0.3, left: pieceSize * 0.25 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: pieceSize * 0.3, right: pieceSize * 0.25 }]} />
        <View style={[styles.smile, { width: pieceSize * 0.5, height: pieceSize * 0.2, borderBottomLeftRadius: pieceSize * 0.2, borderBottomRightRadius: pieceSize * 0.2, borderWidth: 2, borderColor: textBlack, borderTopWidth: 0, top: pieceSize * 0.5, left: pieceSize * 0.25 }]} />
      </View>
      
      {/* Sushi piece 2 */}
      <View style={[styles.sushiPiece, { width: pieceSize, height: pieceSize * 1.2, borderRadius: pieceSize * 0.2, backgroundColor: '#FFE4B5', borderWidth: 3, borderColor: borderBlack }]}>
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: pieceSize * 0.3, left: pieceSize * 0.25 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: pieceSize * 0.3, right: pieceSize * 0.25 }]} />
        <View style={[styles.smile, { width: pieceSize * 0.5, height: pieceSize * 0.2, borderBottomLeftRadius: pieceSize * 0.2, borderBottomRightRadius: pieceSize * 0.2, borderWidth: 2, borderColor: textBlack, borderTopWidth: 0, top: pieceSize * 0.5, left: pieceSize * 0.25 }]} />
      </View>
      
      {/* Sushi piece 3 */}
      <View style={[styles.sushiPiece, { width: pieceSize, height: pieceSize * 1.2, borderRadius: pieceSize * 0.2, backgroundColor: '#FFE4B5', borderWidth: 3, borderColor: borderBlack }]}>
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: pieceSize * 0.3, left: pieceSize * 0.25 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: pieceSize * 0.3, right: pieceSize * 0.25 }]} />
        <View style={[styles.smile, { width: pieceSize * 0.5, height: pieceSize * 0.2, borderBottomLeftRadius: pieceSize * 0.2, borderBottomRightRadius: pieceSize * 0.2, borderWidth: 2, borderColor: textBlack, borderTopWidth: 0, top: pieceSize * 0.5, left: pieceSize * 0.25 }]} />
      </View>
    </View>
  );
}

// Salad illustration
function Salad({ size }: { size: number }) {
  const eyeSize = size * 0.1;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Bowl */}
      <View style={[styles.bowl, { width: size * 0.8, height: size * 0.6, borderBottomLeftRadius: size * 0.4, borderBottomRightRadius: size * 0.4, backgroundColor: '#8B4513', borderWidth: 4, borderColor: borderBlack, top: size * 0.2 }]} />
      
      {/* Lettuce leaves */}
      <View style={[styles.lettuce, { width: size * 0.3, height: size * 0.2, borderRadius: size * 0.15, backgroundColor: '#90EE90', borderWidth: 3, borderColor: borderBlack, top: size * 0.15, left: size * 0.1 }]} />
      <View style={[styles.lettuce, { width: size * 0.35, height: size * 0.25, borderRadius: size * 0.175, backgroundColor: '#90EE90', borderWidth: 3, borderColor: borderBlack, top: size * 0.1, left: size * 0.35 }]} />
      <View style={[styles.lettuce, { width: size * 0.3, height: size * 0.2, borderRadius: size * 0.15, backgroundColor: '#90EE90', borderWidth: 3, borderColor: borderBlack, top: size * 0.15, right: size * 0.1 }]} />
      
      {/* Eyes on top lettuce */}
      <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.2, left: size * 0.42 }]} />
      <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.2, right: size * 0.42 }]} />
      
      {/* Smile */}
      <View style={[styles.smile, { width: size * 0.25, height: size * 0.12, borderBottomLeftRadius: size * 0.12, borderBottomRightRadius: size * 0.12, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: size * 0.35, left: size * 0.38 }]} />
    </View>
  );
}

// Cake illustration
function Cake({ size }: { size: number }) {
  const eyeSize = size * 0.08;
  const layerHeight = size * 0.25;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Bottom layer */}
      <View style={[styles.cakeLayer, { width: size * 0.9, height: layerHeight, borderRadius: size * 0.1, backgroundColor: '#FFB6C1', borderWidth: 4, borderColor: borderBlack, top: size * 0.5 }]} />
      
      {/* Middle layer */}
      <View style={[styles.cakeLayer, { width: size * 0.75, height: layerHeight, borderRadius: size * 0.1, backgroundColor: '#FFB6C1', borderWidth: 4, borderColor: borderBlack, top: size * 0.25 }]} />
      
      {/* Top layer */}
      <View style={[styles.cakeLayer, { width: size * 0.6, height: layerHeight, borderRadius: size * 0.1, backgroundColor: '#FFB6C1', borderWidth: 4, borderColor: borderBlack, top: 0 }]}>
        {/* Eyes */}
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: layerHeight * 0.3, left: size * 0.2 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: layerHeight * 0.3, right: size * 0.2 }]} />
        
        {/* Smile */}
        <View style={[styles.smile, { width: size * 0.3, height: size * 0.12, borderBottomLeftRadius: size * 0.12, borderBottomRightRadius: size * 0.12, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: layerHeight * 0.5, left: size * 0.15 }]} />
      </View>
      
      {/* Cherry on top */}
      <View style={[styles.cherry, { width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075, backgroundColor: '#DC143C', borderWidth: 2, borderColor: borderBlack, top: -size * 0.05, left: size * 0.225 }]} />
    </View>
  );
}

// Coffee illustration
function Coffee({ size }: { size: number }) {
  const eyeSize = size * 0.1;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Cup */}
      <View style={[styles.cup, { width: size * 0.6, height: size * 0.7, borderRadius: size * 0.1, backgroundColor: '#8B4513', borderWidth: 4, borderColor: borderBlack, top: size * 0.15 }]} />
      
      {/* Handle */}
      <View style={[styles.handle, { width: size * 0.2, height: size * 0.3, borderRadius: size * 0.1, borderWidth: 4, borderColor: borderBlack, borderLeftWidth: 0, top: size * 0.25, right: size * 0.05 }]} />
      
      {/* Steam */}
      <View style={[styles.steam, { width: size * 0.08, height: size * 0.15, borderRadius: size * 0.04, borderWidth: 2, borderColor: borderBlack, top: 0, left: size * 0.25 }]} />
      <View style={[styles.steam, { width: size * 0.08, height: size * 0.2, borderRadius: size * 0.04, borderWidth: 2, borderColor: borderBlack, top: -size * 0.05, left: size * 0.46 }]} />
      <View style={[styles.steam, { width: size * 0.08, height: size * 0.15, borderRadius: size * 0.04, borderWidth: 2, borderColor: borderBlack, top: 0, right: size * 0.25 }]} />
      
      {/* Eyes */}
      <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.35, left: size * 0.2 }]} />
      <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.35, right: size * 0.2 }]} />
      
      {/* Smile */}
      <View style={[styles.smile, { width: size * 0.3, height: size * 0.15, borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.15, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: size * 0.5, left: size * 0.15 }]} />
    </View>
  );
}

// Apple illustration
function Apple({ size }: { size: number }) {
  const eyeSize = size * 0.1;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Apple body */}
      <View style={[styles.apple, { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, backgroundColor: '#DC143C', borderWidth: 4, borderColor: borderBlack, top: size * 0.1 }]}>
        {/* Eyes */}
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.3, left: size * 0.25 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.3, right: size * 0.25 }]} />
        
        {/* Smile */}
        <View style={[styles.smile, { width: size * 0.4, height: size * 0.2, borderBottomLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: size * 0.5, left: size * 0.2 }]} />
      </View>
      
      {/* Stem */}
      <View style={[styles.stem, { width: size * 0.1, height: size * 0.15, backgroundColor: '#8B4513', borderWidth: 2, borderColor: borderBlack, top: 0, left: size * 0.45 }]} />
      
      {/* Leaf */}
      <View style={[styles.leaf, { width: size * 0.15, height: size * 0.2, borderRadius: size * 0.075, backgroundColor: '#90EE90', borderWidth: 2, borderColor: borderBlack, top: -size * 0.05, left: size * 0.55 }]} />
    </View>
  );
}

// Taco illustration
function Taco({ size }: { size: number }) {
  const eyeSize = size * 0.08;
  
  return (
    <View style={[styles.foodContainer, { width: size, height: size }]}>
      {/* Taco shell */}
      <View style={[styles.tacoShell, { width: size * 0.9, height: size * 0.7, borderTopLeftRadius: size * 0.45, borderTopRightRadius: size * 0.45, borderBottomLeftRadius: size * 0.1, borderBottomRightRadius: size * 0.1, backgroundColor: '#FFD700', borderWidth: 4, borderColor: borderBlack, top: size * 0.15 }]}>
        {/* Filling */}
        <View style={[styles.filling, { width: size * 0.7, height: size * 0.4, borderRadius: size * 0.05, backgroundColor: '#8B4513', borderWidth: 2, borderColor: borderBlack, top: size * 0.15, left: size * 0.1 }]} />
        
        {/* Eyes */}
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.25, left: size * 0.3 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: textBlack, top: size * 0.25, right: size * 0.3 }]} />
        
        {/* Smile */}
        <View style={[styles.smile, { width: size * 0.35, height: size * 0.15, borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.15, borderWidth: 3, borderColor: textBlack, borderTopWidth: 0, top: size * 0.4, left: size * 0.28 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eye: {
    position: 'absolute',
  },
  smile: {
    position: 'absolute',
  },
  bunTop: {
    position: 'absolute',
    backgroundColor: '#FFD700',
  },
  bunBottom: {
    position: 'absolute',
  },
  patty: {
    position: 'absolute',
    left: '7.5%',
  },
  pizzaBase: {
    position: 'relative',
  },
  pepperoni: {
    position: 'absolute',
  },
  sushiPiece: {
    position: 'relative',
  },
  bowl: {
    position: 'absolute',
    left: '10%',
  },
  lettuce: {
    position: 'absolute',
  },
  cakeLayer: {
    position: 'absolute',
    left: '5%',
  },
  cherry: {
    position: 'absolute',
  },
  cup: {
    position: 'absolute',
    left: '20%',
  },
  handle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  steam: {
    position: 'absolute',
    backgroundColor: '#E0E0E0',
  },
  apple: {
    position: 'absolute',
    left: '10%',
  },
  stem: {
    position: 'absolute',
    borderRadius: 2,
  },
  leaf: {
    position: 'absolute',
  },
  tacoShell: {
    position: 'absolute',
    left: '5%',
  },
  filling: {
    position: 'absolute',
  },
});
















