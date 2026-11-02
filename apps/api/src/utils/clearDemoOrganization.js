import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Organization, User } from '../models/index.js'

const option = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const email = String(option('--email') || '')
  .trim()
  .toLowerCase()
const confirmEmail = String(option('--confirm-email') || '')
  .trim()
  .toLowerCase()

async function run() {
  if (!email) {
    throw new Error(
      'Usage: node apps/api/src/utils/clearDemoOrganization.js --email <demo-account-email> [--confirm-email <same-email>]'
    )
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required; refusing to clear a local or ephemeral database')
  }

  await connectDB()
  const user = await User.findOne({ email }).select('_id email organizationId role').lean()
  if (!user) throw new Error(`Account not found: ${email}`)
  if (user.role !== 'OWNER') throw new Error('Target account must be the organization OWNER')
  if (!mongoose.isValidObjectId(user.organizationId)) {
    throw new Error('Target account has an invalid organization reference')
  }

  const organization = await Organization.findById(user.organizationId).select('_id name').lean()
  if (!organization) {
    throw new Error('Target account organization does not exist; no data was changed')
  }

  const db = mongoose.connection.db
  const collections = await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray()
  const plan = []
  for (const { name } of collections) {
    if (name.startsWith('system.') || name === 'organizations') continue
    const filter =
      name === 'users'
        ? { organizationId: user.organizationId, _id: { $ne: user._id } }
        : { organizationId: user.organizationId }
    const count = await db.collection(name).countDocuments(filter)
    if (count) plan.push({ name, filter, count })
  }

  console.log(`Demo account: ${user.email}`)
  console.log(`Organization: ${organization.name} (${user.organizationId})`)
  console.log('The owner account and organization record will be preserved.')
  if (!plan.length) {
    console.log('No organization-scoped demo data found.')
    return
  }
  for (const item of plan) console.log(`  ${item.name}: ${item.count}`)

  if (confirmEmail !== email) {
    console.log(
      'Dry run only. To delete these records, pass --confirm-email with the same account email.'
    )
    return
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      for (const item of plan) {
        const result = await db.collection(item.name).deleteMany(item.filter, { session })
        if (result.deletedCount !== item.count) {
          throw new Error(`Delete count changed for ${item.name}; transaction aborted`)
        }
      }
    })
  } finally {
    await session.endSession()
  }
  console.log('Organization-scoped demo data cleared. Owner account and organization remain.')
}

run()
  .catch((error) => {
    console.error('Demo cleanup failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect().catch(() => {}))
