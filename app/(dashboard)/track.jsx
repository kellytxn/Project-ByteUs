import { Dimensions, StyleSheet, Text, TouchableWithoutFeedback, Keyboard, ScrollView, View, TextInput, Pressable } from 'react-native'
import { useModule } from '../../hooks/useModule'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { PieChart } from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width

const Track = () => {
  const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [category, setCategory] = useState('')
    const [credit, setCredit] = useState('')
    const [completed, setCompleted] = useState('')
    const [grade, setGrade] = useState('')
    const [loading, setLoading] = useState(false)
    const [showInputs, setShowInputs] = useState(false)

    const { module, createModule } = useModule()
    const router = useRouter()

    const handleCreate = async () => {
      if (
        !code.trim() ||
        !name.trim() ||
        !category.trim() ||
        !credit.trim() ||
        !completed.trim() ||
        !grade.trim()
      ) return

  const creditNumber = parseInt(credit)
  const completedBool = completed.trim().toLowerCase() === 'yes'
  const gradeNumber = parseFloat(grade)

  if (isNaN(creditNumber) || isNaN(gradeNumber)) return
      
  setLoading(true)
    
  await createModule({
    code,
    name,
    category,
    credit: creditNumber,
    completed: completedBool,
    grade: gradeNumber,
  })

  await fetchModule()

    setCode('')
    setName('')
    setCategory('')
    setCredit('')
    setCompleted('')
    setGrade('')

    router.replace("/track")

    setLoading(false) 

    }

    const totalCredits = module.reduce((sum, m) => sum + (m.credit || 0), 0)
  const completedCredits = module.reduce((sum, m) => sum + ((m.completed && m.credit) || 0), 0)

  const chartData = [
    {
      name: '',
      population: completedCredits,
      color: '#B2CBDB',
      legendFontColor: 'transparent',
      legendFontSize: 0,
    },
      {
        name: '',
        population: totalCredits - completedCredits,
        color: 'rgba(178, 203, 219, 0.2)',
      legendFontColor: 'transparent',
      legendFontSize: 0,
    },
  ]

  return (
    <ScrollView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
        {totalCredits > 0 && (
            <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative', height: 300 }}>
            <PieChart
              data={chartData}
              width={screenWidth}
              height={300}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor={'population'}
              backgroundColor={'transparent'}
              //paddingLeft={'10'}
              center={[screenWidth / 2 - 110, 0]}
              hasLegend={false} // <-- Ensure this is false
              absolute
            />
          
            {/* Donut hole with label */}
            <View style={{
              position: 'absolute',
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: '#EBE9E3',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                {completedCredits}/{totalCredits} MCs
              </Text>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                completed
                </Text>
              
            </View>
          </View>
        )}
        <Pressable
            onPress={() => setShowInputs(prev => !prev)}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              {alignSelf: 'flex-end', marginTop: -50}
            ]}
          >
            <Text style={styles.buttonText}>
              {showInputs ? 'Edit' : 'Edit'}
            </Text>
          </Pressable>
          {showInputs && (
            <>
          <Text style={styles.label}>Module code</Text>
          <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder='Enter your module code'
          />

<Text style={styles.label}>Module name</Text>
          <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder='Enter your module name'
          />

<Text style={styles.label}>Category</Text>
          <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder='Enter the category in which your module falls under'
          />

<Text style={styles.label}>Modular Credit</Text>
          <TextInput
          style={styles.input}
          value={credit}
          onChangeText={setCredit}
          placeholder='Enter the modular credit of your module'
          />

<Text style={styles.label}>Have you completed this module?</Text>
          <TextInput
          style={styles.input}
          value={completed}
          onChangeText={setCompleted}
          placeholder= 'Yes / No'
          />
<Text style={styles.label}>Final grade obtained if completed</Text>
          <TextInput
          style={styles.input}
          value={grade}
          onChangeText={setGrade}
          placeholder='Enter the numerical value of your grade, 0 otherwise'
          />  
<Pressable
          onPress={handleCreate} disabled={loading}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>{loading? 'Saving...' : 'Create'}</Text>
        </Pressable>  
        </>    
          )}           
       </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  )
}

export default Track

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
      fontSize: 14,
      borderColor: '#ccc',
      borderWidth: 1,
    },
    button: {
      backgroundColor: '#D2D4DB',
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
})