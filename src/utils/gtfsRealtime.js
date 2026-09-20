const decodeUtf8 = bytes => new TextDecoder().decode(bytes)

function readVarint(bytes, start) {
  let value = 0n
  let shift = 0n
  let index = start
  while (index < bytes.length && shift <= 63n) {
    const byte = bytes[index++]
    value |= BigInt(byte & 0x7f) << shift
    if ((byte & 0x80) === 0) return { value, index }
    shift += 7n
  }
  throw new Error('Malformed GTFS-RT protobuf varint')
}

function readFields(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fields = []
  let index = 0
  while (index < bytes.length) {
    const tag = readVarint(bytes, index)
    index = tag.index
    const field = Number(tag.value >> 3n)
    const wire = Number(tag.value & 7n)
    if (!field) throw new Error('Invalid GTFS-RT protobuf field')
    if (wire === 0) {
      const item = readVarint(bytes, index)
      fields.push({ field, wire, value: item.value })
      index = item.index
    } else if (wire === 1) {
      if (index + 8 > bytes.length) throw new Error('Truncated GTFS-RT fixed64 field')
      fields.push({ field, wire, value: view.getFloat64(index, true) })
      index += 8
    } else if (wire === 2) {
      const length = readVarint(bytes, index)
      index = length.index
      const end = index + Number(length.value)
      if (end > bytes.length) throw new Error('Truncated GTFS-RT bytes field')
      fields.push({ field, wire, value: bytes.subarray(index, end) })
      index = end
    } else if (wire === 5) {
      if (index + 4 > bytes.length) throw new Error('Truncated GTFS-RT fixed32 field')
      fields.push({ field, wire, value: view.getFloat32(index, true) })
      index += 4
    } else {
      throw new Error(`Unsupported GTFS-RT protobuf wire type ${wire}`)
    }
  }
  return fields
}

const first = (fields, id) => fields.find(field => field.field === id)?.value
const stringField = (fields, id) => {
  const bytes = first(fields, id)
  if (bytes === undefined) return ''
  if (!(bytes instanceof Uint8Array)) throw new Error(`GTFS-RT string field ${id} has a non-bytes wire type`)
  return decodeUtf8(bytes)
}

export function decodeVehiclePositions(input) {
  const root = readFields(input)
  const headerBytes = first(root, 1)
  if (!headerBytes) throw new Error('GTFS-RT FeedMessage is missing FeedHeader')
  const header = headerBytes ? readFields(headerBytes) : []
  const feedVersion = stringField(header, 1)
  if (feedVersion !== '2.0') throw new Error(`Unsupported GTFS-RT version: ${feedVersion || 'missing'}`)
  const timestamp = first(header, 3)
  const features = []
  const entities = root.filter(field => field.field === 2)
  let vehicleEntityCount = 0
  let invalidPositionCount = 0
  for (const item of entities) {
    const entity = readFields(item.value)
    const vehicleBytes = first(entity, 4)
    if (!vehicleBytes || first(entity, 2) === 1n) continue
    vehicleEntityCount += 1
    const vehicle = readFields(vehicleBytes)
    const positionBytes = first(vehicle, 2)
    if (!positionBytes) { invalidPositionCount += 1; continue }
    const position = readFields(positionBytes)
    const latitude = first(position, 1)
    const longitude = first(position, 2)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      invalidPositionCount += 1
      continue
    }
    const descriptorBytes = first(vehicle, 8)
    const descriptor = descriptorBytes ? readFields(descriptorBytes) : []
    const tripBytes = first(vehicle, 1)
    const trip = tripBytes ? readFields(tripBytes) : []
    const vehicleTimestamp = first(vehicle, 5)
    features.push({
      type: 'Feature',
      id: stringField(entity, 1),
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties: {
        source_id: 'hsl-gtfs-realtime-vehicles',
        vehicle_id: stringField(descriptor, 1),
        label: stringField(descriptor, 2),
        route_id: stringField(trip, 5),
        stop_id: stringField(vehicle, 7),
        current_status: Number(first(vehicle, 4) ?? 0n),
        observed_at: vehicleTimestamp ? Number(vehicleTimestamp) * 1000 : null,
        evidence_type: 'observed',
      },
    })
  }
  return { type: 'FeatureCollection', features, feedVersion, entityCount: entities.length,
    vehicleEntityCount, invalidPositionCount, providerTimestamp: timestamp ? Number(timestamp) * 1000 : null }
}

export const gtfsRealtimeInternals = { readFields }
