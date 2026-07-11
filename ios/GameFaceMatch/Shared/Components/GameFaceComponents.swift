import SwiftUI

struct PrimaryActionButton<Label: View>: View {
    let action: () -> Void
    @ViewBuilder let label: () -> Label

    var body: some View {
        Button(action: action) {
            label()
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
        }
        .buttonStyle(.borderedProminent)
        .tint(.green)
        .controlSize(.large)
    }
}

struct NoticePanel: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: systemImage)
                .font(.headline)
            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct ScreenScaffold<Content: View>: View {
    let title: String
    let subtitle: String?
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(title)
                        .font(.largeTitle.bold())
                    if let subtitle {
                        Text(subtitle)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }
                content()
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
