import SwiftUI

@main
struct GameFaceMatchApp: App {
    var body: some Scene {
        WindowGroup {
            RootNavigationView(viewModel: RootViewModel())
        }
    }
}
