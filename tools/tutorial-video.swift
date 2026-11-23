import Foundation
import AVFoundation
import CoreVideo
import CoreGraphics
import ImageIO

func fail(_ message: String) -> Never { fputs(message + "\n", stderr); exit(1) }
let args = CommandLine.arguments
if args.count < 3 { fail("encode output.mp4 width height fps | mux manifest.json output.mp4 | inspect video.mp4 poster.png") }
if args[1] == "encode" {
    let url = URL(fileURLWithPath: args[2])
    let width = Int(args[3])!, height = Int(args[4])!, fps = Int32(args[5])!
    try? FileManager.default.removeItem(at: url)
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 3_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2]
    ])
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ])
    writer.add(input); writer.shouldOptimizeForNetworkUse = true
    guard writer.startWriting() else { fail("Unable to start encoder: \(String(describing: writer.error))") }
    writer.startSession(atSourceTime: .zero)
    func readExact(_ count: Int) -> Data? {
        var data = Data()
        while data.count < count {
            guard let part = try? FileHandle.standardInput.read(upToCount: count - data.count), !part.isEmpty else { return nil }
            data.append(part)
        }
        return data
    }
    var frame: Int64 = 0
    while let header = readExact(4) {
        let size = header.reduce(0) { ($0 << 8) | Int($1) }
        guard let png = readExact(size), let source = CGImageSourceCreateWithData(png as CFData, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fail("Invalid frame \(frame)") }
        while !input.isReadyForMoreMediaData { if writer.status == .failed { fail("Encoder failed") }; usleep(1000) }
        var optionalBuffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &optionalBuffer) == kCVReturnSuccess, let buffer = optionalBuffer else { fail("No pixel buffer") }
        CVPixelBufferLockBaseAddress(buffer, [])
        let bitmap = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
        guard let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: bitmap) else { fail("No bitmap context") }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        CVPixelBufferUnlockBaseAddress(buffer, [])
        guard adaptor.append(buffer, withPresentationTime: CMTime(value: frame, timescale: fps)) else { fail("Append failed: \(String(describing: writer.error))") }
        frame += 1
    }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }; semaphore.wait()
    guard writer.status == .completed else { fail("Finish failed: \(String(describing: writer.error))") }
    print("Encoded \(frame) frames")
} else if args[1] == "mux" {
    let data = try Data(contentsOf: URL(fileURLWithPath: args[2]))
    let manifest = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    let video = AVURLAsset(url: URL(fileURLWithPath: manifest["video"] as! String))
    let composition = AVMutableComposition()
    let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: video.duration), of: video.tracks(withMediaType: .video)[0], at: .zero)
    let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
    for chapter in manifest["chapters"] as! [[String: Any]] {
        guard let path = chapter["audio"] as? String else { continue }
        let audio = AVURLAsset(url: URL(fileURLWithPath: path))
        guard let track = audio.tracks(withMediaType: .audio).first else { continue }
        let duration = min(audio.duration.seconds, chapter["duration"] as! Double)
        try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: CMTime(seconds: duration, preferredTimescale: 600)), of: track, at: CMTime(seconds: chapter["start"] as! Double, preferredTimescale: 600))
    }
    let output = URL(fileURLWithPath: args[3]); try? FileManager.default.removeItem(at: output)
    let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality)!
    exporter.outputURL = output; exporter.outputFileType = .mp4; exporter.shouldOptimizeForNetworkUse = true
    let semaphore = DispatchSemaphore(value: 0)
    exporter.exportAsynchronously { semaphore.signal() }; semaphore.wait()
    guard exporter.status == .completed else { fail("Mux failed: \(String(describing: exporter.error))") }
    print("Exported narration")
} else if args[1] == "splice" {
    let data = try Data(contentsOf: URL(fileURLWithPath: args[2]))
    let manifest = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    let base = AVURLAsset(url: URL(fileURLWithPath: manifest["video"] as! String))
    let source = base.tracks(withMediaType: .video)[0]
    let composition = AVMutableComposition()
    let track = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    var cursor = 0.0
    let replacements = (manifest["replacements"] as! [[String:Any]]).sorted { ($0["start"] as! Double) < ($1["start"] as! Double) }
    func time(_ seconds:Double)->CMTime { return CMTime(seconds:seconds,preferredTimescale:600) }
    for replacement in replacements {
        let start = replacement["start"] as! Double, duration = replacement["duration"] as! Double
        if start > cursor {try track.insertTimeRange(CMTimeRange(start:time(cursor),duration:time(start-cursor)),of:source,at:time(cursor))}
        let asset = AVURLAsset(url:URL(fileURLWithPath:replacement["file"] as! String))
        try track.insertTimeRange(CMTimeRange(start:.zero,duration:time(duration)),of:asset.tracks(withMediaType:.video)[0],at:time(start))
        cursor = start + duration
    }
    if cursor < base.duration.seconds {try track.insertTimeRange(CMTimeRange(start:time(cursor),duration:time(base.duration.seconds-cursor)),of:source,at:time(cursor))}
    let output = URL(fileURLWithPath:args[3]);try? FileManager.default.removeItem(at:output)
    let exporter = AVAssetExportSession(asset:composition,presetName:AVAssetExportPreset1280x720)!
    exporter.outputURL=output;exporter.outputFileType = .mp4;exporter.shouldOptimizeForNetworkUse=true
    let semaphore=DispatchSemaphore(value:0)
    exporter.exportAsynchronously {semaphore.signal()};semaphore.wait()
    guard exporter.status == .completed else {fail("Splice failed: \(String(describing:exporter.error))")}
    print("Replaced \(replacements.count) lesson(s); duration=\(composition.duration.seconds)")
} else if args[1] == "inspect" {
    let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
    let generator = AVAssetImageGenerator(asset: asset); generator.appliesPreferredTrackTransform = true
    let time = args.count > 4 ? Double(args[4]) ?? 3 : min(3,asset.duration.seconds/2)
    generator.requestedTimeToleranceBefore = .zero; generator.requestedTimeToleranceAfter = .zero
    let image = try generator.copyCGImage(at: CMTime(seconds: time, preferredTimescale: 600), actualTime: nil)
    let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[3]) as CFURL, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(destination,image,nil); CGImageDestinationFinalize(destination)
    print("duration=\(asset.duration.seconds) video=\(asset.tracks(withMediaType:.video).count) audio=\(asset.tracks(withMediaType:.audio).count) size=\(image.width)x\(image.height)")
} else if args[1] == "verify" {
    let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
    guard let track = asset.tracks(withMediaType: .video).first else { fail("No video track") }
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
    reader.add(output); guard reader.startReading() else { fail("Decoder failed to start") }
    var count = 0
    var last = -1.0
    var sampled = 0
    while let sample = output.copyNextSampleBuffer() {
        let time = CMSampleBufferGetPresentationTimeStamp(sample).seconds
        if time < last { fail("Non-monotonic video timestamp") }; last = time
        if count % 120 == 0, let buffer = CMSampleBufferGetImageBuffer(sample) {
            CVPixelBufferLockBaseAddress(buffer,.readOnly)
            let base = CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to: UInt8.self)
            let stride = CVPixelBufferGetBytesPerRow(buffer)
            var colors = Set<UInt32>()
            for y in Swift.stride(from: 160, to: CVPixelBufferGetHeight(buffer)-160, by: 29) {
                for x in Swift.stride(from: 40, to: CVPixelBufferGetWidth(buffer)-40, by: 31) {
                    let i=y*stride+x*4
                    colors.insert(UInt32(base[i]) | UInt32(base[i+1])<<8 | UInt32(base[i+2])<<16)
                }
            }
            CVPixelBufferUnlockBaseAddress(buffer,.readOnly)
            if colors.count < 8 { fail("Blank or nearly blank picture at \(time)") }; sampled += 1
        }
        count += 1
    }
    guard reader.status == .completed else { fail("Decode failed: \(String(describing: reader.error))") }
    print("Verified \(count) decoded frames; \(sampled) nonblank samples; duration=\(asset.duration.seconds); fps=\(track.nominalFrameRate); audioTracks=\(asset.tracks(withMediaType:.audio).count)")
}
