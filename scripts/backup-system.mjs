#!/usr/bin/env node

/**
 * TokPulse Backup and Disaster Recovery System
 * 
 * This script provides comprehensive backup functionality for:
 * - Database backups (PostgreSQL)
 * - File system backups
 * - Configuration backups
 * - Automated restoration procedures
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

class BackupSystem {
  constructor(options = {}) {
    this.backupDir = options.backupDir || './backups'
    this.retentionDays = options.retentionDays || 30
    this.compressionEnabled = options.compressionEnabled !== false
    this.encryptionEnabled = options.encryptionEnabled || false
    this.encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY
    
    // Ensure backup directory exists
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  /**
   * Create a full system backup
   */
  async createFullBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `full-${timestamp}`
    const backupPath = join(this.backupDir, backupId)
    
    console.log(`🔄 Creating full backup: ${backupId}`)
    
    try {
      // Create backup directory
      mkdirSync(backupPath, { recursive: true })
      
      // 1. Database backup
      await this.backupDatabase(backupPath)
      
      // 2. File system backup
      await this.backupFileSystem(backupPath)
      
      // 3. Configuration backup
      await this.backupConfiguration(backupPath)
      
      // 4. Create backup manifest
      await this.createBackupManifest(backupPath, backupId, 'full')
      
      // 5. Compress if enabled
      if (this.compressionEnabled) {
        await this.compressBackup(backupPath)
      }
      
      // 6. Encrypt if enabled
      if (this.encryptionEnabled) {
        await this.encryptBackup(backupPath)
      }
      
      console.log(`✅ Full backup completed: ${backupId}`)
      return backupId
      
    } catch (error) {
      console.error(`❌ Full backup failed:`, error.message)
      throw error
    }
  }

  /**
   * Create a database-only backup
   */
  async createDatabaseBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `db-${timestamp}`
    const backupPath = join(this.backupDir, backupId)
    
    console.log(`🔄 Creating database backup: ${backupId}`)
    
    try {
      mkdirSync(backupPath, { recursive: true })
      await this.backupDatabase(backupPath)
      await this.createBackupManifest(backupPath, backupId, 'database')
      
      if (this.compressionEnabled) {
        await this.compressBackup(backupPath)
      }
      
      console.log(`✅ Database backup completed: ${backupId}`)
      return backupId
      
    } catch (error) {
      console.error(`❌ Database backup failed:`, error.message)
      throw error
    }
  }

  /**
   * Create a configuration-only backup
   */
  async createConfigurationBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `config-${timestamp}`
    const backupPath = join(this.backupDir, backupId)
    
    console.log(`🔄 Creating configuration backup: ${backupId}`)
    
    try {
      mkdirSync(backupPath, { recursive: true })
      await this.backupConfiguration(backupPath)
      await this.createBackupManifest(backupPath, backupId, 'configuration')
      
      if (this.compressionEnabled) {
        await this.compressBackup(backupPath)
      }
      
      console.log(`✅ Configuration backup completed: ${backupId}`)
      return backupId
      
    } catch (error) {
      console.error(`❌ Configuration backup failed:`, error.message)
      throw error
    }
  }

  /**
   * Backup PostgreSQL database
   */
  async backupDatabase(backupPath) {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set')
    }

    const dbBackupPath = join(backupPath, 'database.sql')
    
    try {
      // Parse database URL
      const url = new URL(dbUrl)
      const host = url.hostname
      const port = url.port || '5432'
      const database = url.pathname.slice(1)
      const username = url.username
      const password = url.password

      // Set PGPASSWORD environment variable
      process.env.PGPASSWORD = password

      // Create pg_dump command
      const pgDumpCmd = [
        'pg_dump',
        `--host=${host}`,
        `--port=${port}`,
        `--username=${username}`,
        `--dbname=${database}`,
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '--format=plain',
        `--file=${dbBackupPath}`
      ].join(' ')

      console.log(`📊 Backing up database to ${dbBackupPath}`)
      execSync(pgDumpCmd, { stdio: 'inherit' })

      // Verify backup file
      if (!existsSync(dbBackupPath)) {
        throw new Error('Database backup file was not created')
      }

      const stats = require('fs').statSync(dbBackupPath)
      console.log(`✅ Database backup created: ${(stats.size / 1024 / 1024).toFixed(2)}MB`)

    } catch (error) {
      console.error('Database backup failed:', error.message)
      throw error
    }
  }

  /**
   * Backup file system
   */
  async backupFileSystem(backupPath) {
    const fsBackupPath = join(backupPath, 'filesystem.tar.gz')
    
    try {
      console.log(`📁 Backing up file system to ${fsBackupPath}`)
      
      // Create tar archive excluding unnecessary files
      const excludePatterns = [
        '--exclude=node_modules',
        '--exclude=.git',
        '--exclude=backups',
        '--exclude=var/log',
        '--exclude=.next',
        '--exclude=dist',
        '--exclude=coverage',
        '--exclude=.turbo'
      ]

      const tarCmd = [
        'tar',
        '-czf',
        fsBackupPath,
        ...excludePatterns,
        '.'
      ].join(' ')

      execSync(tarCmd, { stdio: 'inherit', cwd: process.cwd() })

      // Verify backup file
      if (!existsSync(fsBackupPath)) {
        throw new Error('File system backup was not created')
      }

      const stats = require('fs').statSync(fsBackupPath)
      console.log(`✅ File system backup created: ${(stats.size / 1024 / 1024).toFixed(2)}MB`)

    } catch (error) {
      console.error('File system backup failed:', error.message)
      throw error
    }
  }

  /**
   * Backup configuration files
   */
  async backupConfiguration(backupPath) {
    const configBackupPath = join(backupPath, 'config')
    mkdirSync(configBackupPath, { recursive: true })

    try {
      console.log(`⚙️ Backing up configuration files`)

      // List of configuration files to backup
      const configFiles = [
        '.env.example',
        'package.json',
        'pnpm-lock.yaml',
        'turbo.json',
        'tsconfig.json',
        'docker-compose.yml',
        'docker-compose.prod.yml',
        'ops/Caddyfile',
        'ops/prometheus/prometheus.yml.example',
        'ops/otel-collector/otel-collector.yml',
        'private/license.json',
        'private/flags.json'
      ]

      let backedUpCount = 0
      for (const file of configFiles) {
        if (existsSync(file)) {
          const destPath = join(configBackupPath, file)
          const destDir = require('path').dirname(destPath)
          
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true })
          }
          
          execSync(`cp "${file}" "${destPath}"`)
          backedUpCount++
        }
      }

      console.log(`✅ Configuration backup created: ${backedUpCount} files`)

    } catch (error) {
      console.error('Configuration backup failed:', error.message)
      throw error
    }
  }

  /**
   * Create backup manifest
   */
  async createBackupManifest(backupPath, backupId, type) {
    const manifest = {
      id: backupId,
      type,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      files: [],
      checksums: {},
      metadata: {
        compressionEnabled: this.compressionEnabled,
        encryptionEnabled: this.encryptionEnabled,
        retentionDays: this.retentionDays
      }
    }

    // Calculate file checksums
    const files = require('fs').readdirSync(backupPath, { recursive: true })
    for (const file of files) {
      if (typeof file === 'string') {
        const filePath = join(backupPath, file)
        const stats = require('fs').statSync(filePath)
        
        if (stats.isFile()) {
          const content = readFileSync(filePath)
          const checksum = createHash('sha256').update(content).digest('hex')
          
          manifest.files.push({
            name: file,
            size: stats.size,
            modified: stats.mtime.toISOString()
          })
          
          manifest.checksums[file] = checksum
        }
      }
    }

    // Write manifest
    const manifestPath = join(backupPath, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    
    console.log(`📋 Backup manifest created: ${manifestPath}`)
  }

  /**
   * Compress backup directory
   */
  async compressBackup(backupPath) {
    try {
      console.log(`🗜️ Compressing backup: ${backupPath}`)
      
      const compressedPath = `${backupPath}.tar.gz`
      const tarCmd = `tar -czf "${compressedPath}" -C "${require('path').dirname(backupPath)}" "${require('path').basename(backupPath)}"`
      
      execSync(tarCmd, { stdio: 'inherit' })
      
      // Remove original directory
      execSync(`rm -rf "${backupPath}"`)
      
      console.log(`✅ Backup compressed: ${compressedPath}`)
      
    } catch (error) {
      console.error('Backup compression failed:', error.message)
      throw error
    }
  }

  /**
   * Encrypt backup
   */
  async encryptBackup(backupPath) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided')
    }

    try {
      console.log(`🔐 Encrypting backup: ${backupPath}`)
      
      // Use OpenSSL for encryption
      const encryptedPath = `${backupPath}.enc`
      const opensslCmd = `openssl enc -aes-256-cbc -salt -in "${backupPath}" -out "${encryptedPath}" -k "${this.encryptionKey}"`
      
      execSync(opensslCmd, { stdio: 'inherit' })
      
      // Remove unencrypted file
      execSync(`rm "${backupPath}"`)
      
      console.log(`✅ Backup encrypted: ${encryptedPath}`)
      
    } catch (error) {
      console.error('Backup encryption failed:', error.message)
      throw error
    }
  }

  /**
   * List available backups
   */
  listBackups() {
    const backups = []
    
    if (!existsSync(this.backupDir)) {
      return backups
    }

    const files = require('fs').readdirSync(this.backupDir)
    
    for (const file of files) {
      const filePath = join(this.backupDir, file)
      const stats = require('fs').statSync(filePath)
      
      if (stats.isDirectory()) {
        const manifestPath = join(filePath, 'manifest.json')
        if (existsSync(manifestPath)) {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
          backups.push({
            id: manifest.id,
            type: manifest.type,
            timestamp: manifest.timestamp,
            size: this.calculateDirectorySize(filePath),
            compressed: false,
            encrypted: false
          })
        }
      } else if (file.endsWith('.tar.gz')) {
        const backupId = file.replace('.tar.gz', '')
        backups.push({
          id: backupId,
          type: 'unknown',
          timestamp: stats.mtime.toISOString(),
          size: stats.size,
          compressed: true,
          encrypted: false
        })
      } else if (file.endsWith('.enc')) {
        const backupId = file.replace('.enc', '')
        backups.push({
          id: backupId,
          type: 'unknown',
          timestamp: stats.mtime.toISOString(),
          size: stats.size,
          compressed: false,
          encrypted: true
        })
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  /**
   * Calculate directory size
   */
  calculateDirectorySize(dirPath) {
    let totalSize = 0
    
    const calculateSize = (path) => {
      const stats = require('fs').statSync(path)
      if (stats.isFile()) {
        totalSize += stats.size
      } else if (stats.isDirectory()) {
        const files = require('fs').readdirSync(path)
        for (const file of files) {
          calculateSize(join(path, file))
        }
      }
    }
    
    calculateSize(dirPath)
    return totalSize
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId, options = {}) {
    console.log(`🔄 Restoring backup: ${backupId}`)
    
    try {
      // Find backup file
      const backupPath = this.findBackupPath(backupId)
      if (!backupPath) {
        throw new Error(`Backup not found: ${backupId}`)
      }

      // Decrypt if needed
      let workingPath = backupPath
      if (backupPath.endsWith('.enc')) {
        workingPath = await this.decryptBackup(backupPath)
      }

      // Decompress if needed
      if (workingPath.endsWith('.tar.gz')) {
        workingPath = await this.decompressBackup(workingPath)
      }

      // Read manifest
      const manifestPath = join(workingPath, 'manifest.json')
      if (!existsSync(manifestPath)) {
        throw new Error('Backup manifest not found')
      }

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      console.log(`📋 Restoring ${manifest.type} backup from ${manifest.timestamp}`)

      // Restore based on type
      if (manifest.type === 'full' || manifest.type === 'database') {
        await this.restoreDatabase(workingPath)
      }

      if (manifest.type === 'full' || manifest.type === 'filesystem') {
        await this.restoreFileSystem(workingPath, options)
      }

      if (manifest.type === 'full' || manifest.type === 'configuration') {
        await this.restoreConfiguration(workingPath, options)
      }

      console.log(`✅ Backup restored successfully: ${backupId}`)

    } catch (error) {
      console.error(`❌ Backup restoration failed:`, error.message)
      throw error
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(backupPath) {
    const dbBackupPath = join(backupPath, 'database.sql')
    if (!existsSync(dbBackupPath)) {
      console.log('⚠️ No database backup found, skipping database restoration')
      return
    }

    console.log(`📊 Restoring database from ${dbBackupPath}`)

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set')
    }

    try {
      const url = new URL(dbUrl)
      const host = url.hostname
      const port = url.port || '5432'
      const database = url.pathname.slice(1)
      const username = url.username
      const password = url.password

      process.env.PGPASSWORD = password

      const psqlCmd = [
        'psql',
        `--host=${host}`,
        `--port=${port}`,
        `--username=${username}`,
        `--dbname=${database}`,
        `--file=${dbBackupPath}`
      ].join(' ')

      execSync(psqlCmd, { stdio: 'inherit' })
      console.log(`✅ Database restored successfully`)

    } catch (error) {
      console.error('Database restoration failed:', error.message)
      throw error
    }
  }

  /**
   * Restore file system from backup
   */
  async restoreFileSystem(backupPath, options = {}) {
    const fsBackupPath = join(backupPath, 'filesystem.tar.gz')
    if (!existsSync(fsBackupPath)) {
      console.log('⚠️ No file system backup found, skipping file system restoration')
      return
    }

    console.log(`📁 Restoring file system from ${fsBackupPath}`)

    try {
      const extractCmd = `tar -xzf "${fsBackupPath}" -C "${options.targetDir || process.cwd()}"`
      execSync(extractCmd, { stdio: 'inherit' })
      console.log(`✅ File system restored successfully`)

    } catch (error) {
      console.error('File system restoration failed:', error.message)
      throw error
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreConfiguration(backupPath, options = {}) {
    const configBackupPath = join(backupPath, 'config')
    if (!existsSync(configBackupPath)) {
      console.log('⚠️ No configuration backup found, skipping configuration restoration')
      return
    }

    console.log(`⚙️ Restoring configuration from ${configBackupPath}`)

    try {
      const targetDir = options.targetDir || process.cwd()
      const copyCmd = `cp -r "${configBackupPath}"/* "${targetDir}"`
      execSync(copyCmd, { stdio: 'inherit' })
      console.log(`✅ Configuration restored successfully`)

    } catch (error) {
      console.error('Configuration restoration failed:', error.message)
      throw error
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    console.log(`🧹 Cleaning up backups older than ${this.retentionDays} days`)

    const backups = this.listBackups()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)

    let cleanedCount = 0
    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp)
      if (backupDate < cutoffDate) {
        const backupPath = this.findBackupPath(backup.id)
        if (backupPath) {
          try {
            if (require('fs').statSync(backupPath).isDirectory()) {
              execSync(`rm -rf "${backupPath}"`)
            } else {
              execSync(`rm "${backupPath}"`)
            }
            console.log(`🗑️ Removed old backup: ${backup.id}`)
            cleanedCount++
          } catch (error) {
            console.error(`Failed to remove backup ${backup.id}:`, error.message)
          }
        }
      }
    }

    console.log(`✅ Cleanup completed: ${cleanedCount} backups removed`)
  }

  /**
   * Find backup path by ID
   */
  findBackupPath(backupId) {
    const possiblePaths = [
      join(this.backupDir, backupId),
      join(this.backupDir, `${backupId}.tar.gz`),
      join(this.backupDir, `${backupId}.enc`)
    ]

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path
      }
    }

    return null
  }

  /**
   * Decrypt backup
   */
  async decryptBackup(encryptedPath) {
    const decryptedPath = encryptedPath.replace('.enc', '')
    
    const opensslCmd = `openssl enc -aes-256-cbc -d -in "${encryptedPath}" -out "${decryptedPath}" -k "${this.encryptionKey}"`
    execSync(opensslCmd, { stdio: 'inherit' })
    
    return decryptedPath
  }

  /**
   * Decompress backup
   */
  async decompressBackup(compressedPath) {
    const extractedPath = compressedPath.replace('.tar.gz', '')
    
    const tarCmd = `tar -xzf "${compressedPath}" -C "${require('path').dirname(compressedPath)}"`
    execSync(tarCmd, { stdio: 'inherit' })
    
    return extractedPath
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]
  const backupSystem = new BackupSystem({
    backupDir: process.env.BACKUP_DIR || './backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    compressionEnabled: process.env.BACKUP_COMPRESSION !== 'false',
    encryptionEnabled: process.env.BACKUP_ENCRYPTION === 'true',
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY
  })

  switch (command) {
    case 'full':
      backupSystem.createFullBackup()
        .then(id => console.log(`✅ Full backup created: ${id}`))
        .catch(error => process.exit(1))
      break

    case 'database':
      backupSystem.createDatabaseBackup()
        .then(id => console.log(`✅ Database backup created: ${id}`))
        .catch(error => process.exit(1))
      break

    case 'config':
      backupSystem.createConfigurationBackup()
        .then(id => console.log(`✅ Configuration backup created: ${id}`))
        .catch(error => process.exit(1))
      break

    case 'list':
      const backups = backupSystem.listBackups()
      console.log('📋 Available backups:')
      backups.forEach(backup => {
        console.log(`  ${backup.id} (${backup.type}) - ${backup.timestamp} - ${(backup.size / 1024 / 1024).toFixed(2)}MB`)
      })
      break

    case 'restore':
      const backupId = process.argv[3]
      if (!backupId) {
        console.error('❌ Backup ID required for restore')
        process.exit(1)
      }
      backupSystem.restoreBackup(backupId)
        .then(() => console.log(`✅ Backup restored: ${backupId}`))
        .catch(error => process.exit(1))
      break

    case 'cleanup':
      backupSystem.cleanupOldBackups()
        .then(() => console.log('✅ Cleanup completed'))
        .catch(error => process.exit(1))
      break

    default:
      console.log(`
TokPulse Backup System

Usage: node backup-system.mjs <command> [options]

Commands:
  full                    Create a full system backup
  database               Create a database-only backup
  config                 Create a configuration-only backup
  list                   List available backups
  restore <backup-id>    Restore from backup
  cleanup                Remove old backups

Environment Variables:
  BACKUP_DIR             Backup directory (default: ./backups)
  BACKUP_RETENTION_DAYS  Days to keep backups (default: 30)
  BACKUP_COMPRESSION     Enable compression (default: true)
  BACKUP_ENCRYPTION      Enable encryption (default: false)
  BACKUP_ENCRYPTION_KEY  Encryption key for backups
  DATABASE_URL           Database connection string
      `)
  }
}

export default BackupSystem