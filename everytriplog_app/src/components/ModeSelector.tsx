// src/components/ModeSelector.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

export type AppMode = 'travel' | 'hiking';

interface Props {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const ModeSelector = ({ currentMode, onModeChange }: Props) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSelect = (mode: AppMode) => {
    onModeChange(mode);
    setMenuVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.selectorButton} 
        onPress={() => setMenuVisible(true)}
      >
        <Text style={styles.selectorText}>
          {currentMode === 'travel' ? '🎒 여행 지도 ▾' : '⛰️ 등산 정복 ▾'}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={menuVisible} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleSelect('travel')}>
              <Text style={styles.menuText}>🎒 여행 지도</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleSelect('hiking')}>
              <Text style={styles.menuText}>⛰️ 등산 정복</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  selectorButton: {
    backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: 20, elevation: 5, shadowColor: '#000',
    shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 },
  },
  selectorText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdownMenu: { position: 'absolute', top: 100, left: 20, backgroundColor: 'white', borderRadius: 10, padding: 5, elevation: 5 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginHorizontal: 10 },
});

export default ModeSelector;