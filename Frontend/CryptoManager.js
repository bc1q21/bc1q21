/**
* Cryptographic Operations Manager
* SECURITY CRITICAL: All private key operations happen here
* This module is designed for easy auditing of crypto operations
*/
class CryptoManager {
    constructor() {
        this.masterKey = null;
        this.generatedMnemonic = '';
        this.publicKeyHex = '',
        this.wif = '',
        this.cltvWif = '',
        this.extended = null,
        this.fundingAddress = '';
        this.releaseAddress = '';
        this.aesKeyAddress = ''; //this address is used as AES key to encrypt/decrypt the OP_RETURN data 
        this.fundingPubkeyHex = '';
        this.releasePubkeyHex = '';
        this.unlockTransactions = [];
    }
    
    /**
    * SECURITY CRITICAL: Shared key derivation logic
    * Derives and stores all necessary keys from a validated mnemonic
    */
    async deriveAndStoreKeys(mnemonic) {
        try {
            if (!window.bip39.validateMnemonic(mnemonic, window.english)) {
                throw new Error('Invalid mnemonic phrase');
            }
            
            console.log("mnemonic:", mnemonic);
            // Generate master key and seed
            const seed = await window.bip39.mnemonicToSeed(mnemonic);
            this.masterKey = window.HDKey.fromMasterSeed(seed);
            this.generatedMnemonic = mnemonic;
            
            // Derive child key for BIP44 path (m/44'/0'/0'/0/0)
            const child = this.masterKey.derive("m/44'/0'/0'/0/0");
            
            if (!child.privateKey) {
                throw new Error('Failed to derive private key');
            }
            
            // Create extended private key with version byte and compressed flag
            this.extended = new Uint8Array(child.privateKey.length + 2);
            this.extended[0] = 0x80; // version byte
            this.extended.set(child.privateKey, 1);
            this.extended[child.privateKey.length + 1] = 0x01; // compressed flag
            
            // Generate WIF and public key hex
            this.wif = await this.base58CheckEncode(this.extended);
            this.cltvWif = this.wif; // keep WIF that matches publicKeyHex used in CLTV scripts
            this.publicKeyHex = this.bytesToHex(child.publicKey);
            
            // BIP84 derivation path for native segwit
            const account = this.masterKey.derive("m/84'/0'/0'");
            
            // First address (m/84'/0'/0'/0/0)
            const firstAddressKey = account.deriveChild(0).deriveChild(0);
            this.fundingAddress = await this.createBech32Address(firstAddressKey.publicKey);
            this.fundingPubkeyHex = this.bytesToHex(firstAddressKey.publicKey);



            
            
            /////build WIF from the BIP84 funding key
            this.extended = new Uint8Array(firstAddressKey.privateKey.length + 2);
            this.extended[0] = 0x80; // mainnet privkey prefix
            this.extended.set(firstAddressKey.privateKey, 1);
            this.extended[firstAddressKey.privateKey.length + 1] = 0x01; // compressed
            this.wif = await this.base58CheckEncode(this.extended);



            // Second address (m/84'/0'/0'/0/1)
            const secondAddressKey = account.deriveChild(0).deriveChild(1);
            this.releaseAddress = await this.createBech32Address(secondAddressKey.publicKey);
            this.releasePubkeyHex = this.bytesToHex(secondAddressKey.publicKey);
            

            // Third address (m/84'/0'/0'/0/2)
            const thirdAddressKey = account.deriveChild(0).deriveChild(2);
            this.aesKeyAddress = await this.createBech32Address(thirdAddressKey.publicKey);

            console.log('fundingAddress', this.fundingAddress);
            console.log('releaseAddress', this.releaseAddress);
            console.log('aesKeyAddress', this.aesKeyAddress);
            return { success: true };
        } catch (error) {
            console.error('Key derivation failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
    * Creates a Bech32 address from a public key
    * @param {Uint8Array} pubkey - The public key bytes
    * @returns {string} - The Bech32 address
    */
    async createBech32Address(pubkey) {
        const pubkeyHash = window.nobleHashes.sha256(pubkey);
        const hash160 = window.nobleHashes.ripemd160(pubkeyHash);
        const words = window.bech32.bech32.toWords(hash160);
        words.unshift(0x00); // witness version 0
        return window.bech32.bech32.encode('bc', words);
    }
    
    /**
    * SECURITY CRITICAL: Generate new mnemonic seed
    * This function creates the master private key for the gift
    */
    async generateNewMnemonic() {
        try {
            if (!this.checkCryptoLibraries()) {
                throw new Error('Required crypto libraries not available');
            }
            
            // Generate 12-word mnemonic using BIP39
            const entropy = window.crypto.getRandomValues(new Uint8Array(16));
            const mnemonic = window.bip39.entropyToMnemonic(entropy, window.english);
            
            if (!window.bip39.validateMnemonic(mnemonic, window.english)) {
                throw new Error('Generated mnemonic failed validation');
            }
            
            // Derive and store all keys
            const result = await this.deriveAndStoreKeys(mnemonic);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return { success: true, mnemonic };
        } catch (error) {
            console.error('Mnemonic generation failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
    * SECURITY CRITICAL: Import existing mnemonic
    * Validates and imports user-provided recovery words
    */
    async importMnemonic(mnemonic) {
        try {
            const cleanMnemonic = mnemonic.trim();
            
            // Derive and store all keys
            const result = await this.deriveAndStoreKeys(cleanMnemonic);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Mnemonic import failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
    * SECURITY CRITICAL: Generate time-locked addresses
    * Creates CLTV addresses for each gift date
    */
    async generateCltvAddresses(schedule) {
        try {
            console.log("generateCltvAddresses this.masterKey", this.masterKey);
            console.log("generateCltvAddresses schedule", schedule);
            
            if (!this.masterKey || !schedule?.length) {
                throw new Error('Missing master key or schedule');
            }
            
            const addresses = [];
            
            // Use for...of instead of forEach to properly handle async
            for (const [index, row] of schedule.entries()) {
                const path = `m/84'/0'/0'/1/${index}`;
                const child = this.masterKey.derive(path);
                const pubkey = child.publicKey;
                
                // Convert date to Unix timestamp
                const locktime = Math.floor(new Date(row.date + 'T00:00:00Z').getTime() / 1000);
                
                // Build CLTV script
                const script = this.buildCLTVScript(locktime, this.publicKeyHex);
                const address = await this.createP2SHAddress(script); 
                
                addresses.push({
                    date: row.date,
                    btc: row.btc,
                    address: address,
                    locktime: locktime,
                    path: path,
                    redeemScript: this.bytesToHex(script),
                    pubkey: pubkey.toString('hex')
                });
            }
            
            return { success: true, addresses };
        } catch (error) {
            console.error('CLTV address generation failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
    * SECURITY CRITICAL: Build CLTV script
    * Creates the time-lock script for each gift
    */
    buildCLTVScript(locktime, pubkey) {
        // CLTV script: <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
        const script = [];
        
        // Push locktime as little-endian bytes
        const locktimeBytes = this.numberToLittleEndian(locktime, 4);
        script.push(locktimeBytes.length);
        script.push(...locktimeBytes);
        
        // OP_CHECKLOCKTIMEVERIFY
        script.push(0xb1);
        
        // OP_DROP
        script.push(0x75);
        
        const pubkeyBytes = this.hexToBytes(pubkey);
        script.push(pubkeyBytes.length);                    // Push pubkey length
        script.push(...pubkeyBytes);
        
        // OP_CHECKSIG
        script.push(0xac);
        
        return new Uint8Array(script);
    }
    
    /**
    * Create P2WPKH address from public key
    */
    createP2WPKHAddress(pubkey) {
        // This is a simplified implementation
        // In production, use a proper Bitcoin library
        const hash160 = this.hash160(pubkey);
        return this.encodeBech32('bc', 0, hash160);
    }
    
    /**
    * Create P2SH address from script
    */
    async createP2SHAddress(script) {
        const firstSha256 = await window.nobleHashes.sha256(script);
        const scriptHash = await window.nobleHashes.ripemd160(firstSha256);
        const version = 0x05; // P2SH version byte
        const payload = new Uint8Array([version, ...scriptHash]);
        const checksum = this.doubleHash256(payload).slice(0, 4);
        return this.base58Encode(new Uint8Array([...payload, ...checksum]));
    }
    
    /**
    * Utility functions for crypto operations
    */
    numberToLittleEndian(num, bytes) {
        const result = new Uint8Array(bytes);
        for (let i = 0; i < bytes; i++) {
            result[i] = (num >> (i * 8)) & 0xff;
        }
        return result;
    }
    
    hash160(data) {
        // SHA256 followed by RIPEMD160
        const sha256Hash = window.nobleHashes.sha256(data);
        return window.nobleHashes.ripemd160(sha256Hash);
    }
    
    doubleHash256(data) {
        const firstHash = window.nobleHashes.sha256(data);
        return window.nobleHashes.sha256(firstHash);
    }
    
    bytesToHex(bytes) {
        return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    /**
    * Converts hex string to byte array
    * @param {string} hex - Hex string to convert
    * @returns {Uint8Array} - Byte array
    */
    hexToBytes(hex) {
        if (hex.length % 2 !== 0) throw new Error("Invalid hex");
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }
    
    encodeBech32(hrp, version, data) {
        // Simplified bech32 encoding - use proper library in production
        return window.bech32.encode(hrp, window.bech32.toWords([version, ...data]));
    }
    
    buildP2WPKHScriptPubKeyFromPubkeyHex(pubkeyHex) {
        const pubkeyBytes = this.hexToBytes(pubkeyHex);
        const h160 = this.hash160(pubkeyBytes); // Uint8Array(20)
        // scriptPubKey = OP_0 (0x00) + PUSH_20 (0x14) + h160
        const script = new Uint8Array(2 + h160.length);
        script[0] = 0x00;
        script[1] = 0x14;
        script.set(h160, 2);
        return this.bytesToHex(script);
    }

    
    /**
    * Base58 alphabet for Bitcoin addresses
    */
    BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    
    /**
    * Encodes a buffer to Base58
    * @param {Uint8Array} buffer - Buffer to encode
    * @returns {string} - Base58 encoded string
    */
    base58Encode(buffer) {
        let digits = [0];
        for (const byte of buffer) {
            let carry = byte;
            for (let j = 0; j < digits.length; ++j) {
                carry += digits[j] << 8;
                digits[j] = carry % 58;
                carry = (carry / 58) | 0;
            }
            while (carry) {
                digits.push(carry % 58);
                carry = (carry / 58) | 0;
            }
        }
        let result = '';
        for (const byte of buffer) {
            if (byte === 0) result += '1';
            else break;
        }
        return result + digits.reverse().map(d => this.BASE58_ALPHABET[d]).join('');
    }
    
    
    /**
    * Encodes payload with Base58Check (includes checksum)
    * @param {Uint8Array} payload - Payload to encode
    * @returns {Promise<string>} - Base58Check encoded string
    */
    async base58CheckEncode(payload) {
        const checksum = await window.nobleHashes.sha256(await window.nobleHashes.sha256(payload));
        const full = new Uint8Array(payload.length + 4);
        full.set(payload);
        full.set(checksum.subarray(0, 4), payload.length);
        return this.base58Encode(full);
    }
    
    checkCryptoLibraries() {
        const required = ['bip39', 'HDKey', 'english', 'bech32', 'nobleHashes'];
        const missing = required.filter(lib => !window[lib]);
        
        if (missing.length > 0) {
            console.error(`Missing crypto libraries: ${missing.join(', ')}`);
            return false;
        }
        return true;
    }
    
    reset() {
        this.masterKey = null;
        this.generatedMnemonic = '';
        this.publicKeyHex = '',
        this.wif = '',
        this.cltvWif = '',
        this.extended = null,
        this.fundingAddress = '';
        this.releaseAddress = '';
        this.aesKeyAddress = ''; //this address is used as AES key to encrypt/decrypt the OP_RETURN data 
        this.fundingPubkeyHex = '';
        this.releasePubkeyHex = '';
        this.unlockTransactions = [];
    }
}
