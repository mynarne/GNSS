// src/screens/IntroAuthScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ImageBackground, LayoutAnimation, Platform, UIManager, Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME_COLOR = '#87CEEB';
const WHITE = '#FFFFFF';
const GLASS_BG = 'rgba(255, 255, 255, 0.9)';
const NAVER_COLOR = '#03C75A';
const KAKAO_COLOR = '#FEE500';

type AuthStep = 'intro' | 'login' | 'signup_social' | 'signup_email' | 'signup_password' | 'signup_userinfo' | 'signup_profile';

interface Props {
  onLoginSuccess: () => void;
}

const IntroAuthScreen = ({ onLoginSuccess }: Props) => {
  const [step, setStep] = useState<AuthStep>('intro');
  
  // 입력 상태 관리
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [profileUri, setProfileUri] = useState<string | null>(null);
  
  // 실시간 에러 상태 관리
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [nameError, setNameError] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  
  // 로딩 상태
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);

  const animateToNextStep = (nextStep: AuthStep) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(nextStep);
  };

  // 1. 이메일 검증 로직
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
    } else {
      setEmailError('');
    }
  };

  const handleEmailNext = () => {
    if (!email || emailError) return;
    setIsCheckingEmail(true);
    // 추후 백엔드 이메일 중복 확인 및 인증번호 발송 API 연동
    setTimeout(() => {
      setIsCheckingEmail(false);
      animateToNextStep('signup_password');
    }, 1000);
  };

  // 2. 비밀번호 검증 로직
  const validatePassword = (text: string) => {
    setPassword(text);
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(text)) {
      setPasswordError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
    } else {
      setPasswordError('');
    }
    
    if (passwordConfirm && text !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else {
      setPasswordConfirmError('');
    }
  };

  const validatePasswordConfirm = (text: string) => {
    setPasswordConfirm(text);
    if (password !== text) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else {
      setPasswordConfirmError('');
    }
  };

  const handlePasswordNext = () => {
    if (!password || passwordError || password !== passwordConfirm) return;
    animateToNextStep('signup_userinfo');
  };

  // 3. 닉네임 및 본명 검증 로직
  const handleUserInfoNext = () => {
    let hasError = false;
    if (realName.trim().length < 2) {
      setNameError('본명을 정확히 입력해주세요.');
      hasError = true;
    }
    if (nickname.trim().length < 2) {
      setNicknameError('닉네임은 2자 이상이어야 합니다.');
      hasError = true;
    }
    if (hasError) return;

    setIsCheckingNickname(true);
    // 추후 백엔드 닉네임 중복 확인 API 연동
    setTimeout(() => {
      setIsCheckingNickname(false);
      animateToNextStep('signup_profile');
    }, 1000);
  };

  // 4. 프로필 사진 등록 로직
  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '프로필 사진을 등록하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setProfileUri(result.assets[0].uri);
    }
  };

  // 최종 회원가입 및 DB 전송 로직 (추후 API 연결)
  const handleFinalSignup = () => {
    console.log("DB 저장 요청:", { email, realName, nickname, profileUri });
    onLoginSuccess();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000' }} style={styles.background} blurRadius={5}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={styles.glassPanel}>
              
              {/* 첫 인트로 화면 */}
              {step === 'intro' && (
                <View style={styles.content}>
                  <Ionicons name="map" size={60} color={THEME_COLOR} style={styles.logo} />
                  <Text style={styles.appName}>EveryTripLog</Text>
                  <Text style={styles.welcomeText}>반갑습니다! 당신의 발자취를 남겨보세요.</Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => animateToNextStep('signup_social')}>
                    <Text style={styles.primaryButtonText}>시작하기 (회원가입)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => animateToNextStep('login')} style={styles.loginTextButton}>
                    <Text style={styles.secondaryText}>이미 계정이 있으신가요? 로그인</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 가입 방식 선택 */}
              {step === 'signup_social' && (
                <View style={styles.content}>
                  <Text style={styles.title}>환영합니다! 🎉</Text>
                  <TouchableOpacity style={styles.naverButton} onPress={() => animateToNextStep('signup_userinfo')}>
                    <Text style={styles.naverButtonText}>N 네이버로 3초 만에 시작하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.kakaoButton} onPress={() => animateToNextStep('signup_userinfo')}>
                    <Text style={styles.kakaoButtonText}>카카오로 3초 만에 시작하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.emailButton} onPress={() => animateToNextStep('signup_email')}>
                    <Text style={styles.emailButtonText}>이메일로 가입하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => animateToNextStep('intro')} style={styles.backButton}>
                    <Text style={styles.backText}>처음으로 돌아가기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 이메일 입력 */}
              {step === 'signup_email' && (
                <View style={styles.content}>
                  <Text style={styles.title}>이메일 입력</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>사용하실 이메일을 입력해주세요.</Text>
                    <TextInput style={[styles.input, emailError ? styles.inputError : null]} placeholder="example@email.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={validateEmail} />
                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                    <TouchableOpacity style={[styles.nextButton, (!email || !!emailError) && styles.disabledButton]} onPress={handleEmailNext} disabled={!email || !!emailError || isCheckingEmail}>
                      {isCheckingEmail ? <ActivityIndicator size="small" color={WHITE} /> : <Text style={styles.nextButtonText}>다음</Text>}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => animateToNextStep('signup_social')} style={styles.backButton}>
                    <Text style={styles.backText}>뒤로 가기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 비밀번호 입력 */}
              {step === 'signup_password' && (
                <View style={styles.content}>
                  <Text style={styles.title}>비밀번호 설정</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>비밀번호 (8자 이상, 특수문자 포함)</Text>
                    <TextInput style={[styles.input, passwordError ? styles.inputError : null]} placeholder="비밀번호 입력" secureTextEntry value={password} onChangeText={validatePassword} />
                    {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                    
                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>비밀번호 확인</Text>
                    <TextInput style={[styles.input, passwordConfirmError ? styles.inputError : null]} placeholder="비밀번호 재입력" secureTextEntry value={passwordConfirm} onChangeText={validatePasswordConfirm} />
                    {passwordConfirmError ? <Text style={styles.errorText}>{passwordConfirmError}</Text> : null}

                    <TouchableOpacity style={[styles.nextButton, (!password || !!passwordError || password !== passwordConfirm) && styles.disabledButton]} onPress={handlePasswordNext} disabled={!password || !!passwordError || password !== passwordConfirm}>
                      <Text style={styles.nextButtonText}>다음</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => animateToNextStep('signup_email')} style={styles.backButton}>
                    <Text style={styles.backText}>뒤로 가기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 본명 및 닉네임 입력 */}
              {step === 'signup_userinfo' && (
                <View style={styles.content}>
                  <Text style={styles.title}>개인정보 입력</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>본명을 입력해주세요</Text>
                    <TextInput style={[styles.input, nameError ? styles.inputError : null]} placeholder="홍길동" value={realName} onChangeText={(text) => { setRealName(text); setNameError(''); }} />
                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>앱에서 사용할 닉네임</Text>
                    <TextInput style={[styles.input, nicknameError ? styles.inputError : null]} placeholder="상남자행님" value={nickname} onChangeText={(text) => { setNickname(text); setNicknameError(''); }} />
                    {nicknameError ? <Text style={styles.errorText}>{nicknameError}</Text> : null}

                    <TouchableOpacity style={styles.nextButton} onPress={handleUserInfoNext} disabled={isCheckingNickname}>
                      {isCheckingNickname ? <ActivityIndicator size="small" color={WHITE} /> : <Text style={styles.nextButtonText}>다음 (중복 확인)</Text>}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => animateToNextStep('signup_password')} style={styles.backButton}>
                    <Text style={styles.backText}>뒤로 가기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 프로필 사진 및 완료 */}
              {step === 'signup_profile' && (
                <View style={styles.content}>
                  <Text style={styles.title}>거의 다 왔습니다!</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>멋진 프로필 사진도 등록하시겠어요?</Text>
                    <TouchableOpacity style={styles.profileBox} onPress={pickProfileImage}>
                      {profileUri ? <Image source={{ uri: profileUri }} style={styles.profileImage} /> : <Ionicons name="camera" size={30} color="gray" />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleFinalSignup}>
                      <Text style={styles.primaryButtonText}>가입 완료 및 시작하기!</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleFinalSignup}>
                      <Text style={styles.skipText}>나중에 할게요 (기본 이미지로 시작)</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => animateToNextStep('signup_userinfo')} style={styles.backButton}>
                    <Text style={styles.backText}>뒤로 가기</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  glassPanel: { backgroundColor: GLASS_BG, borderRadius: 25, padding: 30, elevation: 10 },
  content: { alignItems: 'center' },
  logo: { marginBottom: 10 },
  appName: { fontSize: 28, fontWeight: 'bold', color: THEME_COLOR, marginBottom: 10 },
  welcomeText: { fontSize: 16, color: '#555', marginBottom: 30, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subTitle: { fontSize: 14, color: '#777', marginBottom: 25 },
  
  primaryButton: { backgroundColor: THEME_COLOR, width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  primaryButtonText: { color: WHITE, fontSize: 16, fontWeight: 'bold' },
  loginTextButton: { padding: 10 },
  secondaryText: { color: '#666', fontSize: 14, textDecorationLine: 'underline' },
  
  naverButton: { backgroundColor: NAVER_COLOR, width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  naverButtonText: { color: WHITE, fontSize: 16, fontWeight: 'bold' },
  kakaoButton: { backgroundColor: KAKAO_COLOR, width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  kakaoButtonText: { color: '#391B1B', fontSize: 16, fontWeight: 'bold' },
  emailButton: { backgroundColor: '#f5f5f5', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee', marginBottom: 15 },
  emailButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  
  inputContainer: { width: '100%', marginTop: 10 },
  inputLabel: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: WHITE, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 5 },
  inputError: { borderColor: '#ff6b6b', borderWidth: 1.5 },
  errorText: { color: '#ff6b6b', fontSize: 12, marginBottom: 10, paddingLeft: 5 },
  
  nextButton: { alignSelf: 'flex-end', backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, marginTop: 10 },
  nextButtonText: { color: WHITE, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#ccc' },
  
  profileBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  skipText: { color: '#999', fontSize: 14, marginTop: 15, alignSelf: 'center', textDecorationLine: 'underline' },
  
  backButton: { marginTop: 25, padding: 10 },
  backText: { color: '#999', fontSize: 14, textDecorationLine: 'underline' }
});

export default IntroAuthScreen;