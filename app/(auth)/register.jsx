import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, ScrollView, TextInput, Pressable, View, Image, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native'
import { Link } from 'expo-router'
import { useUser } from '../../hooks/useUser'

const Register = () => {
  const [fullName, setFullName] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const { register } = useUser()

  const handleRegister = async () => {
    setError(null)
    try {
      await register(fullName, course, year, semester, email, password)
    } catch (error) {
       setError(error.message)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.content}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder='Enter your full name'
        />

        <Text style={styles.label}>Course</Text>
        <TextInput
          style={styles.input}
          value={course}
          onChangeText={setCourse}
          placeholder='Enter your course'
        />

        <Text style={styles.label}>Year</Text>
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          keyboardType='numeric'
          placeholder='Enter your year'
        />

        <Text style={styles.label}>Semester</Text>
        <TextInput
          style={styles.input}
          value={semester}
          onChangeText={setSemester}
          keyboardType='numeric'
          placeholder='Enter your semester'
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder='Enter your email'
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder='Enter a password'
        />

        <Pressable
          onPress={handleRegister}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>Register</Text>
        </Pressable>

        <Link href='/login' asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </Pressable>
        </Link>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBE9E3',
    paddingHorizontal: 30,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  label: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 6,
    color: '#444',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#DFB6CF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  linkButton: {
    marginTop: 5,
  },
  linkText: {
    color: '#888',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  error: {
    color: '#B00020',
    backgroundColor: '#FDECEA',
    borderColor: '#F5C6CB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  }
})