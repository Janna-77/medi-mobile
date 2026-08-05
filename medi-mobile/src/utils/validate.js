export const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const validatePassword = (password) => {
    const errors = []
    if (password.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter')
    if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter')
    if (!/[0-9]/.test(password)) errors.push('At least one number')
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character')
    return errors
}

export const validateEgyptianNationalId = (id, dob, gender) => {
    const errors = []

    if (!id) return errors

    if (!/^\d{14}$/.test(id)) {
        errors.push('National ID must be exactly 14 digits')
        return errors
    }

    const centuryDigit = parseInt(id[0])
    if (centuryDigit !== 2 && centuryDigit !== 3) {
        errors.push('National ID first digit must be 2 (1900s) or 3 (2000s)')
        return errors
    }

    const century = centuryDigit === 2 ? '19' : '20'
    const yy = id.substring(1, 3)
    const mm = id.substring(3, 5)
    const dd = id.substring(5, 7)
    const idDate = new Date(`${century}${yy}-${mm}-${dd}`)

    if (isNaN(idDate.getTime())) {
        errors.push('National ID contains an invalid birth date')
        return errors
    }

    // Check against entered DOB if provided
    if (dob) {
        const enteredDate = new Date(dob)
        if (
            idDate.getFullYear() !== enteredDate.getFullYear() ||
            idDate.getMonth() !== enteredDate.getMonth() ||
            idDate.getDate() !== enteredDate.getDate()
        ) {
            errors.push('Birth date in national ID does not match the date of birth you entered')
        }
    }

    // Governorate code validation (01-27, 88)
    const govCode = parseInt(id.substring(7, 9))
    const validGovCodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 88]
    if (!validGovCodes.includes(govCode)) {
        errors.push('National ID contains an invalid governorate code')
    }

    // Gender check from last digit
    if (gender) {
        const sequenceLastDigit = parseInt(id[12])
        const idGender = sequenceLastDigit % 2 === 0 ? 'female' : 'male'
        if (gender !== 'other' && idGender !== gender) {
            errors.push(`National ID indicates ${idGender} but you selected ${gender}`)
        }
    }

    return errors
}

export const validateBirthCertificate = (cert) => {
    const errors = []
    if (!cert) return errors
    if (!/^\d{7,10}$/.test(cert)) {
        errors.push('Birth certificate number must be 7 to 10 digits')
    }
    return errors
}

export const getAgeInfo = (dob) => {
    if (!dob) return null
    const today = new Date()
    const birthDate = new Date(dob)
    if (isNaN(birthDate.getTime())) return null

    const isBirthday =
        birthDate.getDate() === today.getDate() &&
        birthDate.getMonth() === today.getMonth()

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }

    if (age < 0) return null
    return { age, isBirthday }
}