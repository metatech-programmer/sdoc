package app.sdoc.document.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifrado AES-256-GCM para contenido sensible de documentos.
 * La clave maestra viene de Vault (secret/sdoc/encryption → document-key).
 * Formato del resultado: Base64(iv[12] || ciphertext || tag[16])
 */
@Service
@Slf4j
public class DocumentEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH = 128;

    @Value("${sdoc.encryption.document-key:}")
    private String base64Key;

    public String encrypt(String plaintext) {
        if (base64Key == null || base64Key.isBlank()) {
            return plaintext;
        }
        try {
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            SecretKey key = new SecretKeySpec(keyBytes, "AES");

            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());
            byte[] combined = ByteBuffer.allocate(iv.length + ciphertext.length)
                .put(iv)
                .put(ciphertext)
                .array();

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Error cifrando contenido del documento", e);
            throw new RuntimeException("Error de cifrado", e);
        }
    }

    public String decrypt(String encryptedBase64) {
        if (base64Key == null || base64Key.isBlank()) {
            return encryptedBase64;
        }
        try {
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            SecretKey key = new SecretKeySpec(keyBytes, "AES");

            byte[] combined = Base64.getDecoder().decode(encryptedBase64);
            ByteBuffer bb = ByteBuffer.wrap(combined);

            byte[] iv = new byte[IV_LENGTH];
            bb.get(iv);
            byte[] ciphertext = new byte[bb.remaining()];
            bb.get(ciphertext);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH, iv));

            return new String(cipher.doFinal(ciphertext));
        } catch (Exception e) {
            log.error("Error descifrando contenido del documento", e);
            throw new RuntimeException("Error de descifrado", e);
        }
    }

    public boolean isEncryptionEnabled() {
        return base64Key != null && !base64Key.isBlank();
    }
}
