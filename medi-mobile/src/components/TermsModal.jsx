import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native'

export default function TermsModal({ onAgree, onDecline, accentColor = '#2596be' }) {
    return (
        <Modal transparent animationType="fade" visible onRequestClose={onDecline}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Terms & Conditions</Text>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.heading}>1. Acceptance of Terms</Text>
                        <Text style={styles.body}>By creating an account on Medi, you agree to these Terms and Conditions. If you do not agree, please do not proceed.</Text>

                        <Text style={styles.heading}>2. Medical Disclaimer</Text>
                        <Text style={styles.body}>Medi is a medical records management platform. It does not provide medical advice, diagnosis, or treatment. All AI-generated summaries are for informational purposes only and should not replace professional medical consultation.</Text>

                        <Text style={styles.heading}>3. Data Privacy</Text>
                        <Text style={styles.body}>Your medical records and personal information are stored securely. We do not sell or share your data with third parties without your explicit consent. Doctors may only access your records if you have granted them permission.</Text>

                        <Text style={styles.heading}>4. User Responsibilities</Text>
                        <Text style={styles.body}>You are responsible for the accuracy of information you provide. You must not upload fraudulent or falsified medical documents. You are responsible for maintaining the confidentiality of your account credentials.</Text>

                        <Text style={styles.heading}>5. Guardian Accounts</Text>
                        <Text style={styles.body}>Guardians are responsible for the accuracy of information provided on behalf of their dependents. By creating a guardian account, you confirm that you have legal authority to manage the dependent's medical records.</Text>

                        <Text style={styles.heading}>6. Doctor Accounts</Text>
                        <Text style={styles.body}>Doctors must provide valid, current medical license information. Medi reserves the right to verify credentials and suspend accounts found to be fraudulent. Your medical licence must remain valid to maintain access.</Text>

                        <Text style={styles.heading}>7. Account Termination</Text>
                        <Text style={styles.body}>Medi reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</Text>

                        <Text style={styles.heading}>8. Doctor Verification</Text>
                        <Text style={styles.body}>Licensed medical practitioners are required to verify their credentials monthly via their medical licence number to maintain access to Medi.</Text>
                    </ScrollView>

                    <View style={styles.row}>
                        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
                            <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.agreeBtn, { backgroundColor: accentColor }]} onPress={onAgree}>
                            <Text style={styles.agreeText}>I Agree</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxHeight: '80%',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
        elevation: 12,
    },
    title: {
        color: '#1a1a2e',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    heading: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 4,
        marginTop: 12,
    },
    body: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 22,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    declineBtn: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#e53e3e',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    declineText: {
        color: '#e53e3e',
        fontWeight: '700',
        fontSize: 14,
    },
    agreeBtn: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    agreeText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
})
