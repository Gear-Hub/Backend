import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import AWS from 'aws-sdk'
import moment from 'moment'
import Promise from 'bluebird'

import Listing from '../models/listing'
import User from '../models/user'
import Like from '../models/like'

const router = express.Router()

const upload = multer()

const s3 = new AWS.S3()

router.post('/', upload.array('photos'), async (req, res) => {
  const { name, description, brand, condition, size, category, price, userId } = req.body
  const photoDescriptions = JSON.parse(req.body.photoDescriptions)

  const user = await User.findById(userId)
  if (user) {
    const newListing = {
      name,
      description,
      photoDescriptions,
      brand,
      condition,
      size,
      price,
      category,
      user,
    }

    let listing = await Listing.create(newListing)

    listing.photos = await Promise.all(req.files.map(async (image, key) => {
      const buffer = await sharp(image.buffer).resize(200, 200).toBuffer()
      await s3.putObject({
        Body: buffer,
        Bucket: `gearhubbucket1/${user.id}/listings/${listing.id}`,
        Key: `photo${key}.png`,
        ACL: 'public-read'
      }).promise()
      return {
        image: `https://s3.amazonaws.com/gearhubbucket1/${user.id}/listings/${listing.id}/photo${key}.png`,
        description: photoDescriptions[key]
      }
    }))
    listing = await listing.save()
    user.listings.push(listing)
    await user.save()
    return res.json(listing)
  }
  return res.status(403).json({ errors: 'Must be a registered user to post' }) // Only get here if front-end issue
})

/**
 * Creates a like given the userId and the listingId
 */
router.post('/like', async (req, res) => {
  const { listingId, userId } = req.body

  const addLike = await Like.create({ listingId, userId })
  if (addLike) 
    return res.status(200).send({ data: 'Liked successfully' })
  else
    return res.status(400).send({ message: 'Failed to like item' })
})

/**
 * Takes user ID, returns array of likes
 */
router.get('/like/:userId', async (req, res) => {
  const { userId } = req.params

  const getLikes = await Like.find({ userId })
  .select('_id listingId')

  getLikes ? res.status(200).send(getLikes) : res.status(400).send('Failed')
})

/**
 * Takes listing ID
 */
router.delete('/like/:_id', async (req, res) => {
  const { _id } = req.params
  const removeLike = await Like.findByIdAndRemove(_id)

  if(removeLike)
    return res.status(200).send({ data: 'Removed like' })
  else
    return res.status(404).send({ message: 'Failed to remove like'})
})

router.get('/recents/:quantity', async (req, res) => {
  const { quantity } = req.params
  const lastDay = moment().subtract(150, 'hours').toDate()
  const listings = await Listing.find({ createdAt: { $gte: lastDay } })

  if (listings) {
    if (!quantity || quantity.length > listings.length) {
      res.send(listings.slice(listings.length - 12, listings.length))
    } else res.send(listings.slice(listings.length - quantity))
  }
})

router.get('/:_id', async (req, res) => {
  const { _id } = req.params
  if (_id) {
    const listing = await Listing.findOne({ _id })
    .populate({ path: 'user', select: 'firstName lastName profile_picture _id'})

    if(listing)
      return res.send(listing)
    else
      return res.status(400).json({ message: `${_id} is not a valid listing ID.`})
    
  }
  return res.status(400).json({ message: 'No ID Provided' })
})

router.get('/user/:userId/:pivotId/:direction', async (req, res) => {
  const { userId, pivotId, direction } = req.params
  let query
  if (direction === 'null')
    query = { user: userId}
  else {
    if(direction === 'next')
      query = { _id: {'$lt': pivotId}, user: userId }
    else
      query = { _id: {'$gt': pivotId}, user: userId }
  }

  const listings = await Listing.find(query)
  .sort({ _id: -1 }) // newest to oldest, 1 is opposite
  .limit(10)

  if(listings) {
    return res.send(listings)    
  }
  else
    return res.status(400).json({ message: 'Failed to fetch listings'})
})

export default router
